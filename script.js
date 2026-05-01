let nivelAtual = 0;
const configuracaoFases = [
    { linhas: 8, colunas: 8, bombas: 6 },   // Fase 1
    { linhas: 10, colunas: 10, bombas: 12 }, // Fase 2
    { linhas: 12, colunas: 12, bombas: 22 }, // Fase 3
    { linhas: 14, colunas: 14, bombas: 40 }, // Fase 4
    { linhas: 16, colunas: 16, bombas: 60 }  // Fase 5
];

let linhas = configuracaoFases[nivelAtual].linhas;
let colunas = configuracaoFases[nivelAtual].colunas;
let numBombas = configuracaoFases[nivelAtual].bombas;

let tabuleiro = [];
let tempoDecorrido = 0;
let intervaloTimer = null;
let jogoIniciado = false;
let pontuacao = 0;
let bombasColocadasNoTabuleiro = false;
let bandeirasColocadas = 0;

// Configuração de Áudio (Dica: Use arquivos locais .mp3 se os links pararem de funcionar)
const somExplosao = new Audio('https://www.soundjay.com/buttons/sounds/button-10.mp3');
const somVitoria = new Audio('https://www.soundjay.com/human/sounds/applause-01.mp3');

// Ajuste de volume para ser "subtle" (sutil)
somExplosao.volume = 0.4;
somVitoria.volume = 0.3;

// Função auxiliar para tocar o som de forma robusta
function tocarSom(audio) {
    audio.currentTime = 0; // Reinicia o áudio do início
    audio.play().catch(e => {
        console.warn("O navegador bloqueou o som ou o arquivo não carregou:", e);
    });
}

function iniciarJogo(resetarProgresso = true) {
    if (resetarProgresso) {
        nivelAtual = 0;
        pontuacao = 0;
    }
    
    linhas = configuracaoFases[nivelAtual].linhas;
    colunas = configuracaoFases[nivelAtual].colunas;
    numBombas = configuracaoFases[nivelAtual].bombas;

    tabuleiro = []; // Limpa o tabuleiro anterior
    jogoIniciado = false;
    pararTimer();
    tempoDecorrido = 0;
    bandeirasColocadas = 0;
    bombasColocadasNoTabuleiro = false;
    
    document.getElementById('fase-display').innerText = `FASE ${nivelAtual + 1}`;
    document.getElementById('timer').innerText = `Tempo: 0s`;
    document.getElementById('score').innerText = `Pontos: 0`;
    document.getElementById('bomb-count').innerText = `💣: ${numBombas}`;
    criarLogicaTabuleiro();
    renderizarTabuleiro();
    exibirRanking();
}

function reiniciarJogo() { iniciarJogo(); }

function iniciarTimer() {
    if (jogoIniciado) return;
    jogoIniciado = true;
    intervaloTimer = setInterval(() => {
        tempoDecorrido++;
        document.getElementById('timer').innerText = `Tempo: ${tempoDecorrido}s`;
    }, 1000);
}

function pararTimer() {
    clearInterval(intervaloTimer);
}

function criarLogicaTabuleiro() {
    // 1. Criar a estrutura de dados (Matriz)
    for (let l = 0; l < linhas; l++) {
        tabuleiro[l] = [];
        for (let c = 0; c < colunas; c++) {
            tabuleiro[l][c] = {
                temBomba: false,
                revelado: false,
                bombasVizinhas: 0,
                elemento: null // Armazenaremos a div aqui
            };
        }
    }
}

function posicionarBombas(lInicial, cInicial) {
    let bombasColocadas = 0;
    while (bombasColocadas < numBombas) {
        let l = Math.floor(Math.random() * linhas);
        let c = Math.floor(Math.random() * colunas);

        // Verifica se a posição é a inicial ou vizinha da inicial (raio de 1)
        let areaSegura = false;
        for (let dl = -1; dl <= 1; dl++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (l === lInicial + dl && c === cInicial + dc) {
                    areaSegura = true;
                }
            }
        }

        if (!tabuleiro[l][c].temBomba && !areaSegura) {
            tabuleiro[l][c].temBomba = true;
            bombasColocadas++;
        }
    }
    
    calcularVizinhos();
}

function calcularVizinhos() {
    for (let l = 0; l < linhas; l++) {
        for (let c = 0; c < colunas; c++) {
            if (tabuleiro[l][c].temBomba) continue;

            let contagem = 0;
            for (let dl = -1; dl <= 1; dl++) {
                for (let dc = -1; dc <= 1; dc++) {
                    let nl = l + dl;
                    let nc = c + dc;
                    if (nl >= 0 && nl < linhas && nc >= 0 && nc < colunas) {
                        if (tabuleiro[nl][nc].temBomba) contagem++;
                    }
                }
            }
            tabuleiro[l][c].bombasVizinhas = contagem;
        }
    }
}

function renderizarTabuleiro() {
    const elementoTabuleiro = document.getElementById('tabuleiro');
    elementoTabuleiro.innerHTML = ''; 
    
    // Ajusta o grid CSS dinamicamente de acordo com a fase
    elementoTabuleiro.style.gridTemplateColumns = `repeat(${colunas}, 35px)`;
    elementoTabuleiro.style.gridTemplateRows = `repeat(${linhas}, 35px)`;

    for (let l = 0; l < linhas; l++) {
        for (let c = 0; c < colunas; c++) {
            const div = document.createElement('div');
            div.classList.add('celula');
            
            // Clique Esquerdo
            div.onclick = () => {
                iniciarTimer();
                clicarCelula(l, c);
            };
            
            // Clique Direito (Bandeira)
            div.oncontextmenu = (e) => marcarBandeira(e, l, c);
            
            tabuleiro[l][c].elemento = div;
            elementoTabuleiro.appendChild(div);
        }
    }
}

function clicarCelula(l, c) {
    if (l < 0 || l >= linhas || c < 0 || c >= colunas) return;
    
    const celula = tabuleiro[l][c];

    // Se for o primeiro clique, gera as bombas agora
    if (!bombasColocadasNoTabuleiro) {
        posicionarBombas(l, c);
        bombasColocadasNoTabuleiro = true;
    }

    if (celula.revelado) return;

    // Referência direta ao elemento
    const div = celula.elemento;

    // Se tiver bandeira, não deixa abrir
    if (div.innerHTML === '🚩') return;

    // 3. Marcar como revelado
    celula.revelado = true;
    div.classList.add('revelada');

    // 4. Lógica de Explosão
    if (celula.temBomba) {
        revelarBombas();
        tocarSom(somExplosao);
        pararTimer();
        salvarPontuacao();
        // Aumentado para 500ms para que o som possa ser ouvido antes do alert travar a tela
        setTimeout(() => {
            alert("BOOM! Fim de jogo em Araçatuba! 💥");
            iniciarJogo();
        }, 500);
        return;
    }

    // 5. Incrementar pontuação e mostrar número ou expandir
    pontuacao++;
    document.getElementById('score').innerText = `Pontos: ${pontuacao}`;

    if (celula.bombasVizinhas === 0) {
        div.innerHTML = '';
        for (let dl = -1; dl <= 1; dl++) {
            for (let dc = -1; dc <= 1; dc++) {
                clicarCelula(l + dl, c + dc);
            }
        }
    } else {
        div.innerHTML = celula.bombasVizinhas;
        div.setAttribute('data-numero', celula.bombasVizinhas);
    }

    // 6. Verificar vitória
    verificarVitoria();
}

function marcarBandeira(e, l, c) {
    e.preventDefault(); 
    const celula = tabuleiro[l][c];
    if (celula.revelado) return;

    const div = celula.elemento;

    if (div.innerHTML === '🚩') {
        div.innerHTML = '';
        bandeirasColocadas--;
    } else {
        div.innerHTML = '🚩';
        bandeirasColocadas++;
    }
    document.getElementById('bomb-count').innerText = `💣: ${numBombas - bandeirasColocadas}`;
}

function verificarVitoria() {
    let celulasAbertas = 0;
    const totalCelulasSeguras = (linhas * colunas) - numBombas;

    for (let l = 0; l < linhas; l++) {
        for (let c = 0; c < colunas; c++) {
            if (tabuleiro[l][c].revelado && !tabuleiro[l][c].temBomba) {
                celulasAbertas++;
            }
        }
    }

    if (celulasAbertas === totalCelulasSeguras) {
        pararTimer();
        tocarSom(somVitoria);
        
        if (nivelAtual < configuracaoFases.length - 1) {
            setTimeout(() => {
                alert(`Fase ${nivelAtual + 1} concluída! Prepare-se para a próxima.`);
                nivelAtual++;
                iniciarJogo(false); // Inicia próxima fase sem zerar pontuação global
            }, 500);
        } else {
            salvarPontuacao();
            setTimeout(() => {
                alert("INCRÍVEL! Você completou todas as fases! 🏆");
                iniciarJogo(true);
            }, 500);
        }
    }
}

function revelarBombas() {
    for (let l = 0; l < linhas; l++) {
        for (let c = 0; c < colunas; c++) {
            if (tabuleiro[l][c].temBomba) {
                const div = tabuleiro[l][c].elemento;
                div.classList.add('revelada', 'bomba');
                div.innerHTML = '💣';
            }
        }
    }
}

function salvarPontuacao() {
    const nome = document.getElementById('nome-jogador').value || "Anônimo";
    const ranking = JSON.parse(localStorage.getItem('rankingMinesweeper') || "[]");
    
    ranking.push({ nome, pontos: pontuacao, tempo: tempoDecorrido });
    // Ordena por pontos (maior pontuação primeiro)
    ranking.sort((a, b) => b.pontos - a.pontos);
    
    // Mantém apenas os 5 melhores
    localStorage.setItem('rankingMinesweeper', JSON.stringify(ranking.slice(0, 5)));
    exibirRanking();
}

function exibirRanking() {
    const ranking = JSON.parse(localStorage.getItem('rankingMinesweeper') || "[]");
    const lista = document.getElementById('lista-ranking');
    lista.innerHTML = ranking.map(item => 
        `<li><span>${item.nome}</span> <span><b>${item.pontos}</b> <small>pts</small></span></li>`
    ).join('');
}

function limparRanking() {
    if (confirm("Deseja realmente apagar todos os recordes? Esta ação não pode ser desfeita.")) {
        localStorage.removeItem('rankingMinesweeper');
        exibirRanking();
    }
}

// Inicializa tudo
iniciarJogo();
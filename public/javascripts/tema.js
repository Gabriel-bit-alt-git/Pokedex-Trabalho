/* ===== tema.js — somente visual =====
   Não altera dados, requisições nem a lógica do index.ejs.
   Faz 3 coisas: colore os tipos, coloca um espaço de foto nas linhas
   da tabela e atualiza a pré-visualização do cartão no formulário. */

(function () {
    'use strict';

    // Cores oficiais de cada tipo 
    const CORES = {
        normal: '#A8A77A',
        fogo: '#EE8130',        
        agua: '#6390F0',        
        planta: '#7AC74C',      
        eletrico: '#F7D02C',    
        gelo: '#96D9D6',        
        lutador: '#C22E28',     
        venenoso: '#A33EA1',
        terrestre: '#E2BF65',
        voador: '#A98FF3',      
        psiquico: '#F95587',    
        inseto: '#A6B91A',      
        pedra: '#B6A136',       
        fantasma: '#735797',    
        dragao: '#6F35FC',      
        sombrio: '#705746',     
        aco: '#B7B7CE',         
        fada: '#D685AD',        
    };

    function slug(texto) {
        return String(texto || '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .trim();
    }

    function corDoTipo(nome) {
        return CORES[slug(nome)] || null;
    }

    /* ---------- Colinha de tipos ---------- */

    document.querySelectorAll('.colinha .tipo-badge').forEach(function (badge) {
        const cor = corDoTipo(badge.textContent);
        if (cor) badge.style.setProperty('--cor-tipo', cor);
    });

    /* ---------- Tabela ---------- */

    function criarBadge(nome) {
        const span = document.createElement('span');
        span.className = 'tipo-badge';
        const cor = corDoTipo(nome);
        if (cor) span.style.setProperty('--cor-tipo', cor);

        const icone = document.createElement('span');
        icone.className = 'icone-tipo';
        icone.setAttribute('data-tipo', slug(nome));

        span.appendChild(icone);
        span.appendChild(document.createTextNode(nome));
        return span;
    }

    function decorarTabela() {
        const linhas = document.querySelectorAll('#tabela-pokemon tr');

        linhas.forEach(function (tr) {
            if (tr.dataset.tema) return;
            const celulas = tr.querySelectorAll('td');
            if (celulas.length !== 7) return; // ignora mensagens (colspan)
            tr.dataset.tema = '1';

            // Nome com espaço para a foto
            const nome = celulas[1].textContent;
            const wrap = document.createElement('div');
            wrap.className = 'celula-nome';

            const foto = document.createElement('div');
            foto.className = 'foto-mini';
            if (tr.dataset.foto) {
                const img = document.createElement('img');
                img.src = tr.dataset.foto;
                img.alt = nome;
                img.onerror = function () { foto.innerHTML = '<span class="pokebola"></span>'; };
                foto.appendChild(img);
            } else {
                foto.innerHTML = '<span class="pokebola"></span>';
            }

            wrap.appendChild(foto);
            wrap.appendChild(document.createTextNode(nome));
            celulas[1].textContent = '';
            celulas[1].appendChild(wrap);

            // Tipos coloridos
            [2, 3].forEach(function (i) {
                const texto = celulas[i].textContent.trim();
                if (!texto) return;
                celulas[i].textContent = '';
                celulas[i].appendChild(criarBadge(texto));
            });
        });
    }

    const tbody = document.getElementById('tabela-pokemon');
    if (tbody) {
        new MutationObserver(decorarTabela).observe(tbody, { childList: true });
        decorarTabela();
    }

    /* ---------- Pré-visualização no formulário ---------- */

    const inputNome = document.getElementById('nome');
    const inputTipo1 = document.getElementById('id_tipo');
    const inputTipo2 = document.getElementById('id_tipo2');
    const previewNome = document.getElementById('preview-nome');
    const slot1 = document.getElementById('slot-tipo1');
    const slot2 = document.getElementById('slot-tipo2');

    // Mesma ordem da tabela "tipos" do banco (id -> nome)
const TIPOS_POR_ID = {
    1: 'Normal',    2: 'Lutador',   3: 'Voador',
    4: 'Venenoso',  5: 'Terrestre', 6: 'Pedra',
    7: 'Inseto',    8: 'Fantasma',  9: 'Aço',
    10: 'Fogo',     11: 'Água',     12: 'Planta',
    13: 'Elétrico', 14: 'Psíquico', 15: 'Gelo',
    16: 'Dragão',   17: 'Sombrio',  18: 'Fada'
};

    // Descobre o nome do tipo a partir do id usando a lista já carregada pela página
    function nomeDoTipo(id, campoNome, campoId) {
        if (!id) return null;
        if (TIPOS_POR_ID[Number(id)]) return TIPOS_POR_ID[Number(id)];
        try {
            const lista = (typeof listaPokemon !== 'undefined') ? listaPokemon : [];
            for (let i = 0; i < lista.length; i++) {
                if (String(lista[i][campoId]) === String(id) && lista[i][campoNome]) {
                    return lista[i][campoNome];
                }
            }
            // o mesmo tipo pode aparecer como primeiro ou segundo
            const outro = campoId === 'id_tipo' ? ['nome_tipo2', 'id_tipo2'] : ['nome_tipo', 'id_tipo'];
            for (let i = 0; i < lista.length; i++) {
                if (String(lista[i][outro[1]]) === String(id) && lista[i][outro[0]]) {
                    return lista[i][outro[0]];
                }
            }
        } catch (e) { /* só visual: ignora */ }
        return null;
    }

    function pintarSlot(slot, input, rotuloVazio, nome) {
        const texto = slot.querySelector('.texto-tipo');
        if (nome) {
            slot.classList.add('preenchido');
            texto.textContent = nome;
            const cor = corDoTipo(nome);
            slot.style.setProperty('--cor-tipo', cor || '#888');
            input.style.setProperty('--cor-input', cor || '#888');
        } else {
            slot.classList.remove('preenchido');
            texto.textContent = input.value ? 'Tipo ' + input.value : rotuloVazio;
            slot.style.removeProperty('--cor-tipo');
            input.style.removeProperty('--cor-input');
        }
    }

    /* ---------- Foto do Pokémon ---------- */

    const inputFoto = document.getElementById('foto');            // guarda o caminho ou a imagem nova (data URL)
    const inputArquivo = document.getElementById('foto_arquivo');
    const btnEnviar = document.getElementById('btn-enviar-foto');
    const btnRemover = document.getElementById('btn-remover-foto');
    const fotoPreview = document.getElementById('foto-preview');
    const galeria = document.getElementById('galeria-grade');

    const TAMANHO_MAXIMO_LADO = 400; // a foto é reduzida no navegador antes de ser enviada
    const POKEBOLA_HTML = '<span class="pokebola"></span>';

    function mostrarFoto() {
        if (!fotoPreview || !inputFoto) return;
        const valor = inputFoto.value;
        fotoPreview.innerHTML = POKEBOLA_HTML;
        if (!valor) return;

        const img = document.createElement('img');
        img.alt = 'Foto do Pokémon';
        img.onerror = function () { fotoPreview.innerHTML = POKEBOLA_HTML; };
        img.src = valor;
        fotoPreview.innerHTML = '';
        fotoPreview.appendChild(img);

        // destaca a imagem pronta escolhida
        if (galeria) {
            galeria.querySelectorAll('button').forEach(function (b) {
                b.classList.toggle('selecionada', b.dataset.caminho === valor);
            });
        }
    }

    // Lê o arquivo, reduz para no máximo 400px e guarda como data URL em #foto
    function prepararArquivo(arquivo) {
        if (!arquivo) return;
        if (!/^image\/(png|jpeg|webp)$/.test(arquivo.type)) {
            alert('Escolha uma imagem PNG, JPG ou WEBP.');
            inputArquivo.value = '';
            return;
        }

        const leitor = new FileReader();
        leitor.onload = function () {
            const img = new Image();
            img.onload = function () {
                const escala = Math.min(1, TAMANHO_MAXIMO_LADO / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(img.width * escala));
                canvas.height = Math.max(1, Math.round(img.height * escala));
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

                inputFoto.value = canvas.toDataURL('image/png', 0.85);
                mostrarFoto();
            };
            img.onerror = function () { alert('Não foi possível abrir essa imagem.'); };
            img.src = leitor.result;
        };
        leitor.readAsDataURL(arquivo);
    }

    if (btnEnviar && inputArquivo && inputFoto) {
        btnEnviar.addEventListener('click', function () { inputArquivo.click(); });
        inputArquivo.addEventListener('change', function () { prepararArquivo(inputArquivo.files[0]); });
    }

    if (btnRemover && inputFoto) {
        btnRemover.addEventListener('click', function () {
            inputFoto.value = '';
            if (inputArquivo) inputArquivo.value = '';
            mostrarFoto();
        });
    }

    // Galeria de imagens prontas (arquivos da pasta public/images/prontas)
    if (galeria && inputFoto) {
        fetch('/api/imagens-prontas')
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (caminhos) {
                if (!caminhos.length) {
                    galeria.innerHTML = '<span class="galeria-vazia">Nenhuma imagem pronta.</span>';
                    return;
                }
                caminhos.forEach(function (caminho) {
                    const botao = document.createElement('button');
                    botao.type = 'button';
                    botao.className = 'galeria-item';
                    botao.dataset.caminho = caminho;
                    botao.title = caminho.split('/').pop().replace(/\.[^.]+$/, '');

                    const img = document.createElement('img');
                    img.src = caminho;
                    img.alt = botao.title;
                    botao.appendChild(img);

                    botao.addEventListener('click', function () {
                        inputFoto.value = caminho;
                        if (inputArquivo) inputArquivo.value = '';
                        mostrarFoto();
                    });
                    galeria.appendChild(botao);
                });
                mostrarFoto();
            })
            .catch(function () { /* só visual: ignora */ });
    }

    let ultimo = '';
    let ultimaFoto = null;

    function atualizarPreview() {
        // a foto também muda por código (editar / salvar), então é conferida aqui
        if (inputFoto) {
            const assinatura = inputFoto.value.length + ':' + inputFoto.value.slice(-24);
            if (assinatura !== ultimaFoto) {
                ultimaFoto = assinatura;
                if (!inputFoto.value && inputArquivo) inputArquivo.value = '';
                mostrarFoto();
            }
        }

        const chave = [inputNome.value, inputTipo1.value, inputTipo2.value,
            (typeof listaPokemon !== 'undefined' ? listaPokemon.length : 0)].join('|');
        if (chave === ultimo) return;
        ultimo = chave;

        previewNome.textContent = inputNome.value.trim() || '???';
        pintarSlot(slot1, inputTipo1, 'Tipo 1', nomeDoTipo(inputTipo1.value, 'nome_tipo', 'id_tipo'));
        pintarSlot(slot2, inputTipo2, 'Tipo 2', nomeDoTipo(inputTipo2.value, 'nome_tipo2', 'id_tipo2'));
    }

    if (inputNome && inputTipo1 && inputTipo2 && previewNome && slot1 && slot2) {
        ['input', 'change'].forEach(function (ev) {
            document.getElementById('form-pokemon').addEventListener(ev, atualizarPreview);
        });
        // cobre preenchimentos feitos por código (editar) e reset do formulário
        setInterval(atualizarPreview, 300);
        atualizarPreview();
    }
})();
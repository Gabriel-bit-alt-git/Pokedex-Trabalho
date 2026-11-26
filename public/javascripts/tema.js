/* ===== tema.js — somente visual =====
   Não altera dados, requisições nem a lógica do index.ejs.
   Faz 3 coisas: colore os tipos, coloca um espaço de foto nas linhas
   da tabela e atualiza a pré-visualização do cartão no formulário. */

(function () {
    'use strict';

    // Cores oficiais de cada tipo (nomes em português e inglês)
    const CORES = {
        normal: '#A8A77A',
        fogo: '#EE8130',        fire: '#EE8130',
        agua: '#6390F0',        water: '#6390F0',
        planta: '#7AC74C',      grama: '#7AC74C',   grass: '#7AC74C',
        eletrico: '#F7D02C',    electric: '#F7D02C',
        gelo: '#96D9D6',        ice: '#96D9D6',
        lutador: '#C22E28',     lutadora: '#C22E28', fighting: '#C22E28',
        veneno: '#A33EA1',      poison: '#A33EA1',
        terra: '#E2BF65',       solo: '#E2BF65',    ground: '#E2BF65',
        voador: '#A98FF3',      flying: '#A98FF3',
        psiquico: '#F95587',    psychic: '#F95587',
        inseto: '#A6B91A',      bug: '#A6B91A',
        pedra: '#B6A136',       rock: '#B6A136',
        fantasma: '#735797',    ghost: '#735797',
        dragao: '#6F35FC',      dragon: '#6F35FC',
        sombrio: '#705746',     noturno: '#705746', dark: '#705746',
        aco: '#B7B7CE',         metal: '#B7B7CE',   steel: '#B7B7CE',
        fada: '#D685AD',        fairy: '#D685AD'
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
            foto.innerHTML = '<span class="pokebola"></span>';

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

    // Descobre o nome do tipo a partir do id usando a lista já carregada pela página
    function nomeDoTipo(id, campoNome, campoId) {
        if (!id) return null;
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

    let ultimo = '';

    function atualizarPreview() {
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

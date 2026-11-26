var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');
var crypto = require('crypto');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
const db = require('./config/db');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json({ limit: '3mb' })); // aceita a foto (já reduzida pelo navegador) em base64
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

/* ===== Fotos dos Pokémon =====
   - Foto enviada pelo usuário: chega como data URL (png/jpeg/webp), é gravada em public/uploads
   - Imagem pronta: um arquivo da pasta public/images/prontas
   Na tabela fica salvo só o caminho (coluna "foto"). */
const PASTA_UPLOADS = path.join(__dirname, 'public', 'uploads');
const PASTA_PRONTAS = path.join(__dirname, 'public', 'images', 'prontas');
const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024; // 2 MB

fs.mkdirSync(PASTA_UPLOADS, { recursive: true });
fs.mkdirSync(PASTA_PRONTAS, { recursive: true });

// Recebe o que o navegador mandou e devolve o caminho a gravar no banco (ou null)
async function salvarFoto(foto) {
    if (!foto || typeof foto !== 'string') return null;

    // 1) Foto nova enviada pelo usuário
    const dataUrl = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(foto);
    if (dataUrl) {
        const extensao = dataUrl[1] === 'jpeg' ? 'jpg' : dataUrl[1];
        const buffer = Buffer.from(dataUrl[2], 'base64');

        if (buffer.length > TAMANHO_MAXIMO_FOTO) {
            const erro = new Error('Imagem muito grande (máximo de 2 MB).');
            erro.statusCode = 400;
            throw erro;
        }

        const nome = Date.now() + '-' + crypto.randomBytes(6).toString('hex') + '.' + extensao;
        await fs.promises.writeFile(path.join(PASTA_UPLOADS, nome), buffer);
        return '/uploads/' + nome;
    }

    // 2) Imagem pronta ou foto já enviada antes (mantém o caminho se o arquivo existir)
    const existente = /^\/(images\/prontas|uploads)\/([\w-][\w.-]*)$/.exec(foto);
    if (existente) {
        const pasta = existente[1] === 'uploads' ? PASTA_UPLOADS : PASTA_PRONTAS;
        if (fs.existsSync(path.join(pasta, existente[2]))) {
            return foto;
        }
    }

    return null;
}

// Apaga do disco uma foto enviada pelo usuário (imagens prontas nunca são apagadas)
async function apagarFotoEnviada(caminho) {
    const m = /^\/uploads\/([\w-][\w.-]*)$/.exec(caminho || '');
    if (!m) return;
    try {
        await fs.promises.unlink(path.join(PASTA_UPLOADS, m[1]));
    } catch (e) { /* arquivo já não existe: ignora */ }
}

// Lista as imagens prontas disponíveis para escolher
app.get('/api/imagens-prontas', async (req, res) => {
    try {
        const arquivos = await fs.promises.readdir(PASTA_PRONTAS);
        res.json(
            arquivos
                .filter(a => /^[\w-][\w.-]*\.(png|jpe?g|webp|gif|svg)$/i.test(a))
                .sort()
                .map(a => '/images/prontas/' + a)
        );
    } catch (erro) {
        console.error('Erro ao listar imagens prontas:', erro);
        res.status(500).json({ erro: 'Erro ao listar imagens prontas.' });
    }
});

app.get('/api/pokedex', async (req, res) => {
    try {
        let sql = `
            SELECT
                p.id_pokemon,
                p.id_tipo,
                p.id_tipo2,
                p.nome AS nome_pokemon,
                p.quant_evolucoes,
                p.geracao,
                p.foto,
                t1.nome_tipo AS nome_tipo,
                t2.nome_tipo AS nome_tipo2
            FROM pokedex p
            LEFT JOIN tipos t1 ON p.id_tipo = t1.id_tipo
            LEFT JOIN tipos t2 ON p.id_tipo2 = t2.id_tipo
            WHERE 1 = 1
        `;

        const parametros = [];

        if (req.query.pesquisa) {
            sql += ` AND (p.nome LIKE ? OR t1.nome_tipo LIKE ? OR t2.nome_tipo LIKE ?)`;

            parametros.push(
                '%' + req.query.pesquisa + '%',
                '%' + req.query.pesquisa + '%',
                '%' + req.query.pesquisa + '%'
            );
        }

        sql += ' ORDER BY p.id_pokemon';

        const [rows] = await db.query(sql, parametros);

        res.json(rows);

    } catch (err) {
        console.error(err);

        res.status(500).json({
            erro: 'Erro ao buscar pokémon: ' + err.message
        });
    }
});

app.post('/api/pokedex', async (req, res) => {
    try {
        const { id_tipo, id_tipo2, nome, quant_evolucoes, geracao, foto } = req.body;

        const caminhoFoto = await salvarFoto(foto);

        const sql = `
            INSERT INTO pokedex
            (id_tipo, id_tipo2, nome, quant_evolucoes, geracao, foto)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const [resultado] = await db.query(sql, [
            id_tipo,
            id_tipo2 ?? null,
            nome,
            quant_evolucoes,
            geracao,
            caminhoFoto
        ]);

        res.status(201).json({
            mensagem: 'Pokémon Registrado.',
            id_pokemon: resultado.insertId
        });

    } catch (erro) {
        console.error('Erro ao registrar pokémon:', erro);

        res.status(erro.statusCode || 500).json({
            erro: erro.statusCode ? erro.message : 'Erro ao registrar pokémon.'
        });
    }
});

app.put('/api/pokedex/:id', async (req, res) => {
    try {
        const id = req.params.id;

        const { id_tipo, id_tipo2, nome, quant_evolucoes, geracao, foto } = req.body;

        if (!id_tipo || !nome || quant_evolucoes == null || geracao == null) {
            return res.status(400).json({
                erro: 'Preencha todos os campos.'
            });
        }

        // foto que o Pokémon tinha antes (para apagar do disco se for trocada)
        const [antigos] = await db.query(
            'SELECT foto FROM pokedex WHERE id_pokemon = ?',
            [id]
        );

        const caminhoFoto = await salvarFoto(foto);

        const [resultado] = await db.query(
            `UPDATE pokedex
             SET id_tipo = ?,
                 id_tipo2 = ?,
                 nome = ?,
                 quant_evolucoes = ?,
                 geracao = ?,
                 foto = ?
             WHERE id_pokemon = ?`,
            [id_tipo, id_tipo2 ?? null, nome, quant_evolucoes, geracao, caminhoFoto, id]
        );

        if (resultado.affectedRows === 0) {
            await apagarFotoEnviada(caminhoFoto);
            return res.status(404).json({
                erro: 'Pokémon não encontrado.'
            });
        }

        const fotoAntiga = antigos[0] ? antigos[0].foto : null;
        if (fotoAntiga && fotoAntiga !== caminhoFoto) {
            await apagarFotoEnviada(fotoAntiga);
        }

        res.json({
            mensagem: 'Pokémon atualizado com sucesso.'
        });

    } catch (erro) {
        console.error('Erro ao atualizar pokémon:', erro);

        res.status(erro.statusCode || 500).json({
            erro: erro.statusCode ? erro.message : 'Erro ao atualizar pokémon.'
        });
    }
});

app.delete('/api/pokedex/:id', async (req, res) => {
    try {
        const id = req.params.id;

        const [antigos] = await db.query(
            'SELECT foto FROM pokedex WHERE id_pokemon = ?',
            [id]
        );

        const [resultado] = await db.query(
            'DELETE FROM pokedex WHERE id_pokemon = ?',
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Pokémon não encontrado.'
            });
        }

        if (antigos[0]) {
            await apagarFotoEnviada(antigos[0].foto);
        }

        res.json({
            mensagem: 'Pokémon deletado com sucesso.'
        });

    } catch (erro) {
        console.error('Erro ao deletar pokémon:', erro);

        res.status(500).json({
            erro: 'Erro ao deletar pokémon.'
        });
    }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
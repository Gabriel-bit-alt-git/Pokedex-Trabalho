var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
const db = require('./config/db');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

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
                t.nome_tipo
            FROM pokedex b, tipos t
            WHERE p.id_tipo = t.id_tipo AND p.id_tipo2 = t.id_tipo
        `;

        const parametros = [];

        if (req.query.pesquisa) {
            sql += ` AND (p.nome LIKE ? OR p.id_tipo LIKE ? AND p.id_tipo2 LIKE ?)`;

            parametros.push(
                '%' + req.query.pesquisa + '%',
                '%' + req.query.pesquisa + '%'
            );
        }

        sql += ' ORDER BY b.ecos';

        const [rows] = await db.query(sql, parametros);

        res.json(rows);

    } catch (err) {
        console.error(err);

        res.status(500).json({
            erro: 'Erro ao buscar pokemon: ' + err.message
        });
    }
});

app.post('/api/pokedex', async (req, res) => {
    try {
        const { id_pokemon, id_tipo, id_tipo2, nome, quant_evolucoes, geracao } = req.body;

        const sql = `
            INSERT INTO pokedex
            (id_pokemon, id_tipo, id_tipo2, nome, quant_evolucoes, geracao)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const [resultado] = await db.query(sql, [
            id_pokemon,
            id_tipo,
            id_tipo2,
            nome,
            quant_evolucoes,
            geracao
        ]);

        res.status(201).json({
            mensagem: 'Pokemon Registrado.',
            id_criatura: resultado.insertId
        });

    } catch (erro) {
        console.error('Erro ao registrar pokemon:', erro);

        res.status(500).json({
            erro: 'Erro ao registrar pokemon.'
        });
    }
});

app.put('/api/pokedex/:id', async (req, res) => {
    try {
        const id = req.params.id;

        const { id_pokemon, id_tipo, id_tipo2, nome, quant_evolucoes, geracao } = req.body;

        if (!id_pokemon || !id_tipo || !id_tipo2 || !nome || quant_evolucoes == null || geracao == null) {
            return res.status(400).json({
                erro: 'Preencha todos os campos.'
            });
        }

        const [resultado] = await db.query(
            `UPDATE pokedex
             SET id_pokemon = ?,
                 id_tipo = ?,
                 id_tipo2 = ?,
                 nome = ?,
                 quant_evolucoes = ?,
                 geracao = ?`,
            [id_pokemon, id_tipo, id_tipo2, nome, quant_evolucoes, geracao, id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Pokemon não encontrado.'
            });
        }

        res.json({
            mensagem: 'Pokemon atualizado com sucesso.'
        });

    } catch (erro) {
        console.error('Erro ao atualizar pokemon:', erro);

        res.status(500).json({
            erro: 'Erro ao atualizar pokemon.'
        });
    }
});

app.delete('/api/pokedex/:id', async (req, res) => {
    try {
        const id = req.params.id;

        const [resultado] = await db.query(
            'DELETE FROM pokedex WHERE id_pokemon = ?',
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Pokemon não encontrado.'
            });
        }

        res.json({
            mensagem: 'Pokemon deletado com sucesso.'
        });

    } catch (erro) {
        console.error('Erro ao deletar pokemon:', erro);

        res.status(500).json({
            erro: 'Erro ao deletar pokemon.'
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
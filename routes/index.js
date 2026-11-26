const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get(['/', '/itens', '/fibbauru'], async (req, res, next) => {
    try {
        const pesquisa = req.query.pesquisa || '';

        let sql = `
            SELECT
                p.id_pokemon,
                p.id_tipo,
                p.id_tipo2,
                p.nome AS nome_pokemon,
                p.quant_evolucoes,
                p.geracao,
                t1.nome_tipo AS nome_tipo,
                t2.nome_tipo AS nome_tipo2
            FROM pokedex p
            LEFT JOIN tipos t1 ON p.id_tipo = t1.id_tipo
            LEFT JOIN tipos t2 ON p.id_tipo2 = t2.id_tipo
            WHERE 1 = 1
        `;

        const parametros = [];

        if (pesquisa) {
            sql += ` AND (p.nome LIKE ? OR p.id_tipo LIKE ? OR p.id_tipo2 LIKE ?)`;

            parametros.push(
                '%' + pesquisa + '%',
                '%' + pesquisa + '%',
                '%' + pesquisa + '%'
            );
        }

        sql += ' ORDER BY p.id_pokemon';

        const [pokedex] = await db.query(sql, parametros);

        res.render('index', {
            pokedex,
            pesquisa,
            cadastrado: req.query.cadastrado === '1'
        });

    } catch (erro) {
        next(erro);
    }
});

router.post('/itens', async (req, res, next) => {
    try {
        const { id_tipo, id_tipo2, nome, quant_evolucoes, geracao } = req.body;

        const sql = `
            INSERT INTO pokedex
            (id_tipo, id_tipo2, nome, quant_evolucoes, geracao)
            VALUES (?, ?, ?, ?, ?)
        `;

        await db.query(sql, [
            id_tipo,
            id_tipo2 ?? null,
            nome,
            quant_evolucoes,
            geracao
        ]);

        res.redirect(303, '/?cadastrado=1');

    } catch (erro) {
        next(erro);
    }
});

module.exports = router;
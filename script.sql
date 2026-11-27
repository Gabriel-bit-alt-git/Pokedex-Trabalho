CREATE DATABASE bdnode;
USE bdnode;

CREATE TABLE tipos (
    id_tipo INT AUTO_INCREMENT PRIMARY KEY,
    nome_tipo VARCHAR(40) NOT NULL
);

INSERT INTO tipos (nome_tipo)
VALUES
('Normal'),		#1
('Lutador'),	#2
('Voador'),		#3
('Venenoso'),	#4
('Terrestre'),	#5
('Pedra'),		#6
('Inseto'),		#7
('Fantasma'),	#8
('Aço'),		#9
('Fogo'),		#10
('Água'),		#11
('Planta'),		#12
('Elétrico'),	#13
('Psíquico'),	#14
('Gelo'),		#15
('Dragão'),		#16
('Sombrio'),	#17
('Fada');		#18

CREATE TABLE pokedex (
    id_pokemon INT AUTO_INCREMENT PRIMARY KEY,
    id_tipo INT,
    id_tipo2 INT NULL,
    nome VARCHAR(50) NOT NULL,
    quant_evolucoes INT,
    geracao INT,
    foto VARCHAR(255) NULL,
    FOREIGN KEY (id_tipo) REFERENCES tipos(id_tipo),
    FOREIGN KEY (id_tipo2) REFERENCES tipos(id_tipo)
);

INSERT INTO pokedex VALUES
(NULL, 12, 4, 'Bulbasaur', 3, 1, NULL),
(NULL, 11, NULL, 'Squirtle', 3, 1, NULL),
(NULL, 10, NULL, 'Charmander', 3, 1, NULL);
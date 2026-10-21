-- Cria o usuário e os bancos do projeto (desenvolvimento e testes).
-- Execute UMA vez, conectado como administrador (usuário "postgres"):
--
--   psql -U postgres -f banco/criar_banco.sql
--
-- Se aparecer "already exists", é só porque já foi criado antes: pode ignorar.

CREATE USER drone WITH PASSWORD 'drone';
CREATE DATABASE droneexpress      OWNER drone;
CREATE DATABASE droneexpress_test OWNER drone;

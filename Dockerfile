# Use a imagem oficial do Node.js 14 como base
FROM node:14

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de definição do projeto e baixa as dependências
COPY package*.json ./
RUN npm install

# Copia os arquivos do código-fonte para o diretório de trabalho
COPY . .

# Expõe a porta em que o app estará disponível
EXPOSE 8080

# Comando para iniciar a aplicação
CMD [ "npx", "nodemon", "index.js" ]

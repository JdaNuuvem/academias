# Pagamento PIX — Academia

Página interna de geração de PIX para operadores da academia.  
Clique em um plano → preencha os dados do aluno → o QR Code e copia-e-cola são gerados via API Bynet (HubPague).

## Planos disponíveis

| Plano  | Valor/mês  |
|--------|-----------|
| TP2    | R$ 129,90 |
| TP3    | R$ 159,90 |
| TP4    | R$ 179,90 |
| TP5    | R$ 210,00 |
| TP5GO  | R$ 259,90 |
| TP6    | R$ 309,90 |
| TP7    | R$ 349,90 |

---

## Stack

- **HTML + CSS + JS** puros — sem framework, sem bundler
- **Nginx 1.27 Alpine** como servidor de produção
- **qrcodejs** (cdnjs) para renderização do QR Code no cliente
- API Key armazenada em `localStorage` — nunca exposta no código

---

## Deploy no Coolify

### Pré-requisitos
- Repositório Git (GitHub, GitLab ou Gitea) com este projeto
- Instância Coolify com acesso ao repositório

### Passos

1. **Novo recurso** → `Application` → selecione o repositório
2. Em **Build Pack** → escolha `Dockerfile`
3. **Dockerfile Location** → `/Dockerfile` (raiz do projeto)
4. **Port** → `80`
5. Em **Domains** → configure seu domínio ou use o subdomínio automático do Coolify
6. Clique em **Deploy**

### Primeira utilização

Após o deploy, acesse a URL e clique em **"Configurar API"** (canto superior direito) para inserir sua `x-api-key` da Bynet. A chave é salva no `localStorage` do navegador de cada operador.

---

## Desenvolvimento local

```bash
# Python (sem instalação)
python -m http.server 8888 --directory .

# Acesse: http://localhost:8888
```

## Build e teste Docker local

```bash
docker build -t pix-academia .
docker run -p 8080:80 pix-academia

# Acesse: http://localhost:8080
```

---

## Segurança

> **Atenção:** A API Key fica no `localStorage` do navegador do operador.  
> Esta página deve estar em uma URL interna/restrita — **não exponha publicamente**.  
> Recomenda-se proteger com autenticação HTTP Basic no Coolify (Middleware → Basic Auth).

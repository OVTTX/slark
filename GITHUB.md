# Como subir o app da Slark para o GitHub

Repositório: https://github.com/OVTTX/slark
O Git local já está configurado apontando para esse endereço, com os commits prontos.

## Passo a passo (cole no seu terminal, dentro da pasta do projeto)

### 1. Confirme que está na branch main
```bash
git branch -M main
```

### 2. Envie para o GitHub

**Se o repositório no GitHub estiver VAZIO** (sem README, sem nada):
```bash
git push -u origin main
```

**Se o repositório JÁ TIVER algum arquivo** (ex: um README criado na hora da criação),
o push acima vai ser recusado. Nesse caso, junte o que está lá com o nosso código:
```bash
git pull origin main --allow-unrelated-histories
# resolva conflitos se aparecerem, depois:
git push -u origin main
```

Na primeira vez o GitHub vai pedir login ou um Personal Access Token.
Pronto — o código estará em github.com/OVTTX/slark ✅

## Nas próximas alterações
```bash
git add -A
git commit -m "descreva o que mudou"
git push
```

## ⚠️ Segurança
- O arquivo `.env` (com as chaves reais do Supabase) NÃO é enviado ao GitHub, de
  propósito — está no `.gitignore`. Nunca suba chaves reais.
- Quem clonar o repo deve copiar `.env.example` para `.env` e preencher com as
  próprias chaves.

# CONTEXTO-MESTRE — SUPER SKIN CHALLENGE

**Versão:** 1.1  
**Data de consolidação:** 18/10/2026  
**Última atualização:** desempate absoluto por MD1 e contabilização oficial de rounds em encerramentos antecipados.  
**Status:** formato, premiação, regras, desempate e contagem oficial de rounds consolidados; a especificação visual e funcional do site ainda será fornecida por Gustavo.

---

## 0. COMO USAR ESTE DOCUMENTO

Este arquivo é a **fonte de verdade atual** do projeto. Ele foi criado para transferir o trabalho para Claude/Claude Code sem perder decisões, correções ou detalhes importantes da conversa.

### Instruções para qualquer IA ou desenvolvedor que receber este contexto

1. Trate tudo marcado como **CONFIRMADO** como regra vigente.
2. Não recupere versões antigas descartadas.
3. Não invente participantes, patrocinadores, horário, mapas, regras secundárias ou critérios extras.
4. Antes de implementar o site, aguarde Gustavo explicar a estrutura visual, as páginas, as funções e o fluxo administrativo.
5. Preserve rigorosamente a distinção entre **round**, **partida** e **confronto/série**. Essa distinção é essencial para não interpretar a regra da faca de forma errada.
6. Para elementos gráficos simples, diagramas e ícones, SVG/CSS pode ser usado. Para ilustrações, banners, personagens ou imagens rasterizadas, o fluxo definido é gerar o ativo do zero no ChatGPT e depois utilizá-lo no site.
7. Não altere o regulamento para “melhorar” o torneio sem aprovação explícita de Gustavo.
8. Em empate absoluto da Fase 1, use uma partida extra em **MD1**; não invente sorteio, ordem alfabética ou confronto direto como critério automático.
9. Em encerramento antecipado por faca ou punição, registre **10 rounds para o vencedor** e mantenha para o perdedor o placar real que ele tinha no momento do encerramento.

---

# 1. RESUMO EXECUTIVO

O projeto é um pequeno evento competitivo entre amigos no Discord chamado:

# **SUPER SKIN CHALLENGE**

O prêmio principal intermediário é a **Phantom Champions 2026**. O vencedor da final ganha essa Phantom e, em seguida, pode enfrentar Zacarias no desafio final. Se derrotar Zacarias, a premiação é elevada para o **pacote completo Champions 2026**.

O evento terá três fases:

1. **Fase 1 — Todos contra todos**, em confrontos MD3.
2. **Fase 2 — Grande Final**, entre o 1º e o 2º colocados, em MD5.
3. **Fase 3 — Chefão Final**, campeão contra Zacarias, em MD3.

O número final de participantes ainda pode ser **3 ou 4**. O site precisa ser pensado para suportar ambos os cenários.

Na Fase 1, a tabela é ordenada por:

1. confrontos vencidos;
2. total de rounds ganhos;
3. partida extra em **MD1**, caso a igualdade permaneça.

Se uma partida terminar antecipadamente por kill de faca ou punição, o vencedor recebe **10 rounds oficiais** e o perdedor conserva a quantidade real de rounds que tinha naquele instante.

---

# 2. IDENTIDADE DO EVENTO

## 2.1 Nome oficial — CONFIRMADO

**Super Skin Challenge**

### Nomes antigos que não devem mais ser usados

- ~~Super Skin Challenge do Zacarias~~
- Qualquer nome que faça parecer que o evento pertence exclusivamente a Zacarias.

O nome foi neutralizado porque há co-owner e poderá haver mais de um patrocinador.

## 2.2 Papel das pessoas — CONFIRMADO

### Zacarias

- Idealizador/organizador do evento.
- Representado visualmente por um personagem inspirado no Chamber, normalmente de cartola.
- É o **chefão final** da Fase 3.
- Não deve ser automaticamente rotulado como “co-owner” em artes futuras, a menos que Gustavo determine isso.

### Tapioca

- Nick: **Tapioca**.
- É **co-owner / co-dono do evento**.
- Também foi descrito como patrocinador do evento.
- Deve aparecer em artes futuras com destaque compatível com essa função.

### Outro patrocinador

- Existe a possibilidade/expectativa de um patrocinador adicional.
- Nome, identidade visual e papel ainda não foram informados.
- Não preencher esse campo por conta própria.

## 2.3 Data — contexto atual

- O evento foi anunciado para **a noite de 18/10/2026**.
- O horário exato não foi definido neste contexto.
- Caso o site ou anúncio seja publicado em outra data, atualizar a expressão “hoje à noite”.

---

# 3. VOCABULÁRIO OFICIAL DO REGULAMENTO

Esta seção é indispensável para evitar ambiguidades.

## Round

Uma rodada individual dentro de uma partida. O placar de uma partida é contado em rounds, por exemplo: 6x4, 9x8 ou 9x9.

## Partida

Um jogo individual dentro de uma série/confronto.

- A partida normalmente termina quando alguém alcança **10 rounds**.
- A partida também pode terminar imediatamente por uma kill de faca.
- A partida pode ser perdida automaticamente por quebra de regra.
- Em encerramento antecipado por faca ou punição, o vencedor recebe placar oficial de **10 rounds**, enquanto o perdedor mantém o número real de rounds que possuía no momento do encerramento.

## Confronto ou série

O conjunto de partidas disputado entre dois jogadores.

- **MD1:** uma única partida; usada como desempate absoluto da Fase 1.
- **MD3:** vence quem ganhar 2 partidas.
- **MD5:** vence quem ganhar 3 partidas.

## Vitória de confronto

Vitória na MD3 ou MD5 como um todo. Na Fase 1, é isso que conta primeiro para a classificação.

## Vitória de partida

Um ponto dentro da MD1, MD3 ou MD5. Uma kill de faca concede a vitória da partida atual, e não uma vitória automática na série inteira.

## Rounds ganhos

Soma dos rounds oficialmente registrados para o jogador durante a Fase 1.

- Em uma partida concluída normalmente, usa-se o placar real final.
- Em uma partida encerrada antecipadamente por faca ou punição, o vencedor recebe **10 rounds** e o perdedor mantém o placar real que tinha no momento do encerramento.

O total de rounds ganhos é o primeiro critério de desempate depois do número de confrontos vencidos.

---

# 4. FORMATO OFICIAL DO EVENTO

## 4.1 FASE 1 — TODOS CONTRA TODOS — CONFIRMADO

Todos os participantes enfrentam todos os outros participantes uma vez.

Cada confronto da Fase 1 é uma **MD3**:

- vence o confronto quem ganhar primeiro **2 partidas**;
- todos os confrontos usam as mesmas regras de armas, faca, 9x9 e punições descritas neste documento.

### Se houver 3 participantes

Usando A, B e C como exemplo:

1. A × B
2. A × C
3. B × C

Total da fase:

- **3 confrontos**;
- cada participante joga **2 confrontos**.

É possível ocorrer empate completo em vitórias:

- A vence B;
- B vence C;
- C vence A;
- todos terminam com 1 vitória e 1 derrota.

Nesse caso, compara-se o total de rounds ganhos. Se o total também ficar igual, os jogadores envolvidos disputam uma partida extra em **MD1**.

### Se houver 4 participantes

Usando A, B, C e D como exemplo:

1. A × B
2. A × C
3. A × D
4. B × C
5. B × D
6. C × D

Total da fase:

- **6 confrontos**;
- cada participante joga **3 confrontos**.

Também pode haver empate entre dois ou mais jogadores. O primeiro desempate é o total de rounds ganhos. Persistindo igualdade, serão registradas partidas extras em **MD1** entre os envolvidos até que as posições afetadas sejam definidas.

## 4.2 CLASSIFICAÇÃO DA FASE 1 — CONFIRMADO

A ordem da tabela será definida por:

1. **Número de confrontos vencidos**.
2. **Total de rounds ganhos**, quando houver empate em confrontos vencidos.
3. **Partida extra em MD1**, caso os jogadores continuem empatados também no total de rounds ganhos.

### Exemplo por rounds

Se dois jogadores têm a mesma quantidade de vitórias, mas:

- Jogador A somou 15 rounds ganhos;
- Jogador B somou 12 rounds ganhos;

A fica acima de B na tabela.

### Desempate absoluto — CONFIRMADO

Se dois jogadores permanecerem empatados tanto em confrontos vencidos quanto em rounds ganhos:

- eles jogam **uma única partida extra em MD1**;
- o vencedor da MD1 ocupa a posição superior;
- a MD1 não se transforma em MD3.

Se mais de dois jogadores permanecerem exatamente empatados, a administração poderá registrar as **MD1 adicionais necessárias entre os envolvidos** até definir todas as posições afetadas. O site deve permitir criação manual desses desempates e nunca ordenar silenciosamente por nome, cadastro ou sorteio.

### Classificação

Os **2 melhores colocados** da Fase 1 avançam para a Fase 2.

## 4.3 FASE 2 — GRANDE FINAL — CONFIRMADO

- O **1º colocado** enfrenta o **2º colocado**.
- O confronto é uma **MD5**.
- Vence quem conquistar primeiro **3 partidas**.

### Prêmio da Fase 2

O vencedor da Grande Final já garante:

# **PHANTOM CHAMPIONS 2026**

Esse prêmio permanece garantido mesmo que o campeão perca a Fase 3.

## 4.4 FASE 3 — CHEFÃO FINAL — CONFIRMADO

- O campeão da Fase 2 enfrenta **Zacarias**.
- O confronto é uma **MD3**.
- Vence quem conquistar primeiro **2 partidas**.

### Se o campeão vencer Zacarias

A premiação sobe para:

# **PACOTE COMPLETO CHAMPIONS 2026**

### Se o campeão perder para Zacarias

Ele continua levando a **Phantom Champions 2026** garantida na Fase 2.

O desafio contra Zacarias funciona como uma chance de upgrade da premiação, não como risco de perder a Phantom.

---

# 5. REGRAS OFICIAIS DAS PARTIDAS

As regras abaixo valem para todas as fases, salvo alteração explícita posterior.

## 5.1 Objetivo padrão da partida — CONFIRMADO

Cada partida vai até um jogador alcançar **10 rounds**, exceto quando ela terminar antes por:

- kill de faca;
- punição por quebra de regra.

Em qualquer encerramento antecipado:

- o vencedor recebe placar oficial de **10 rounds**;
- o perdedor mantém a quantidade real de rounds que possuía no instante do encerramento;
- esse placar oficial entra normalmente na soma de rounds ganhos da Fase 1.

## 5.2 Primeiro round — CONFIRMADO

No **1º round de cada partida**, a arma de fogo permitida é somente:

# **SHERIFF**

A faca continua permitida como exceção, conforme a regra especial da faca.

## 5.3 Do segundo round em diante — CONFIRMADO

Do **2º round até o fim da partida**, a arma de fogo permitida é somente:

# **VANDAL**

A faca continua permitida em qualquer round.

## 5.4 Regra da faca — CONFIRMADO E CORRIGIDO

Se um jogador matar o adversário de faca em qualquer round, ele vence imediatamente:

# **AQUELA PARTIDA DA SÉRIE**

Isso significa:

- em uma MD3, a kill de faca concede 1 vitória de partida; ainda é necessário chegar a 2 vitórias para vencer a série;
- em uma MD5, a kill de faca concede 1 vitória de partida; ainda é necessário chegar a 3 vitórias para vencer a série;
- para a classificação, o vencedor recebe **10 rounds**, enquanto o perdedor conserva o placar real que tinha no momento da kill.

### Exemplo oficial de contabilização

Se o placar estava 4x1 e o jogador que tinha 1 round mata de faca:

- a partida termina imediatamente;
- o placar oficial passa a ser **10x4** para quem matou de faca;
- o vencedor soma 10 rounds;
- o adversário mantém 4 rounds.

### Regra antiga descartada

A faca **não** concede vitória automática na MD3 ou MD5 inteira.

Ela encerra apenas a partida atual.

## 5.5 Regra especial do 9x9 — CONFIRMADO

Se a partida chegar ao placar de **9x9**, o round decisivo será obrigatoriamente disputado:

# **SOMENTE NA FACA**

Nesse round:

- Sheriff não é permitida;
- Vandal não é permitida;
- qualquer outra arma de fogo não é permitida.

A regra do 9x9 substitui a regra normal de Vandal a partir do segundo round.

## 5.6 Quebra de regra — CONFIRMADO

Qualquer descumprimento do regulamento causa:

- derrota automática na **partida atual**;
- o adversário recebe **1 vitória de partida** na MD3 ou MD5;
- o adversário vencedor recebe **10 rounds oficiais**;
- o infrator mantém o total real de rounds que tinha no momento da infração.

A punição não significa derrota automática em toda a série, salvo se essa vitória completar a quantidade necessária para o adversário vencer a MD3 ou MD5.

### Exemplos de quebra de regra

- usar Vandal no primeiro round;
- usar Sheriff depois do primeiro round;
- usar arma de fogo no round obrigatório de faca em 9x9;
- utilizar outra arma em desacordo com as restrições vigentes.

---

# 6. EXEMPLOS PARA EVITAR INTERPRETAÇÃO ERRADA

## Exemplo A — Kill de faca em MD3

Placar da série antes da partida:

- Jogador A: 0 partidas
- Jogador B: 0 partidas

Na primeira partida, B lidera os rounds por 4x1. A, que tinha 1 round, mata B de faca.

Resultado:

- a primeira partida termina imediatamente;
- o placar oficial daquela partida é **10x4 para A**;
- A soma 10 rounds e B mantém os 4 rounds que já possuía;
- A passa a liderar a série por 1x0;
- a MD3 continua;
- A ainda precisa vencer mais uma partida.

## Exemplo B — Quebra de regra

Na segunda partida de uma MD3, um jogador usa Sheriff depois do primeiro round.

Resultado:

- ele perde automaticamente a segunda partida;
- o adversário recebe uma vitória de partida;
- o adversário é registrado com **10 rounds**;
- o infrator conserva a quantidade de rounds que tinha no momento da infração;
- a série só termina se esse ponto completar duas vitórias para o adversário.

## Exemplo C — 9x9

A partida chega a 9x9.

Resultado:

- o próximo round deve ser jogado somente de faca;
- o vencedor desse round vence a partida por 10x9.

## Exemplo D — Empate na Fase 1 resolvido por rounds

Três jogadores terminam com uma vitória de confronto cada.

Rounds ganhos:

- A: 17
- B: 15
- C: 12

Classificação:

1. A
2. B
3. C

A e B avançam para a Fase 2.

## Exemplo E — Empate absoluto

Dois jogadores terminam com:

- a mesma quantidade de confrontos vencidos;
- o mesmo total de rounds ganhos.

Resultado:

- eles disputam uma partida extra em **MD1**;
- o vencedor da MD1 fica acima na classificação.

---

# 7. DECISÕES COMPLEMENTARES CONFIRMADAS E PONTOS AINDA ABERTOS

## 7.1 Desempate absoluto — CONFIRMADO

Se houver igualdade em:

1. confrontos vencidos;
2. total de rounds ganhos;

o desempate será decidido por **uma partida extra em MD1** entre os jogadores empatados.

O vencedor da MD1 ocupa a posição superior. Em empate múltiplo, a administração poderá registrar as MD1 adicionais necessárias entre os envolvidos até resolver as posições afetadas.

## 7.2 Contagem de rounds em encerramentos antecipados — CONFIRMADO

Quando uma partida terminar antecipadamente por kill de faca ou punição:

- o vencedor recebe **10 rounds oficiais**;
- o perdedor conserva o total real que tinha no momento do encerramento;
- esses valores entram na soma de rounds ganhos da Fase 1.

Exemplo: placar 4x1; o jogador com 1 mata de faca. Resultado oficial: **10x4 para quem matou de faca**.

## 7.3 Configuração de jogo — AINDA ABERTA

Ainda não foram definidos de forma final:

- mapa ou lista de mapas;
- ordem/seleção de mapas;
- lado inicial;
- agente obrigatório ou livre;
- uso de habilidades;
- compra/economia;
- plant/objetivo;
- tempo de round;
- regras de espectador;
- pausas;
- desconexão;
- ausência ou atraso;
- rematch;
- abandono;
- prova/validação de resultado.

## 7.4 Participantes

- Quantidade provável: 3 ou 4.
- Nomes ainda não consolidados neste documento.

## 7.5 Patrocinador adicional

- Identidade e forma de exposição ainda pendentes.

## 7.6 Horário

- Evento descrito como “hoje à noite”.
- Horário exato pendente.

---

# 8. REQUISITOS MÍNIMOS JÁ INFERIDOS PARA O SITE

> **Atenção:** Gustavo ainda vai explicar como o site deve ser. Esta seção registra somente o mínimo lógico já exigido pelo regulamento, não uma especificação completa de interface.

O site deverá, no mínimo, ser capaz de representar:

1. **Fase 1 — tabela de classificação**.
2. **Confrontos todos contra todos** para 3 ou 4 participantes.
3. **MD3 da Fase 1**, registrando cada partida da série.
4. **Número de confrontos vencidos** por participante.
5. **Total de rounds ganhos** por participante.
6. Ordenação da tabela por:
   - confrontos vencidos;
   - total de rounds;
   - resultado de MD1 extra, quando necessário.
7. Detecção de empate absoluto e cadastro de **partida extra em MD1**.
8. **Fase 2 — MD5** entre 1º e 2º.
9. **Fase 3 — MD3** entre o campeão e Zacarias.
10. Exibição clara dos prêmios:
    - Phantom na Fase 2;
    - pacote completo ao derrotar Zacarias.
11. Registro de encerramento de partida por:
    - placar normal;
    - kill de faca;
    - punição por quebra de regra.
12. Aplicação do placar oficial de **10 rounds para o vencedor** em encerramentos por faca ou punição, preservando o placar real do perdedor.
13. Possibilidade de criar manualmente MD1 adicionais em caso de empate múltiplo.

## Recomendação de modelagem conceitual

Sem impor tecnologia, a lógica deve separar:

- `participant` — participante;
- `phase` — fase;
- `series` ou `matchup` — confronto MD1/MD3/MD5;
- `game` — partida dentro da série;
- `officialRoundScore` — placar oficial usado na classificação;
- `scoreAtTermination` — placar real no momento de faca ou infração, para auditoria;
- `gameWinReason` — normal, knife ou violation;
- `isTiebreak` — indica MD1 de desempate;
- `standings` — classificação da Fase 1.

Essa separação evita o erro de tratar uma kill de faca como vitória de toda a série e preserva a diferença entre placar real e placar administrativo.

## Comportamento obrigatório no empate absoluto

Se dois jogadores empatarem também em rounds ganhos:

- exibir o empate até a MD1 ser registrada;
- permitir criar uma partida extra em **MD1**;
- posicionar o vencedor da MD1 acima do perdedor;
- não desempatar alfabeticamente, por ordem de cadastro ou por sorteio silencioso.

Em empate entre mais de dois jogadores, permitir que a administração registre as MD1 adicionais necessárias até definir as posições afetadas.

---

# 9. TEXTOS OFICIAIS EM MARKDOWN PARA O DISCORD

Os dois textos abaixo foram condensados para caber no limite padrão de 2.000 caracteres por mensagem.

- Mensagem 1: **968 caracteres**.
- Mensagem 2: **825 caracteres**.

Enviar como **duas mensagens separadas**, de preferência imediatamente após o vídeo.

Ao copiar para o Discord, copiar somente o conteúdo interno; não enviar as cercas de código com três crases.

## 9.1 Mensagem 1 — formato do evento

```md
# 🏆 SUPER SKIN CHALLENGE

## 🌙 HOJE À NOITE

Chegou a hora de disputar a **Phantom Champions 2026** e encarar o desafio final pelo **pacote completo**.

**Co-owner do evento:** Tapioca

---

## 🎮 FORMATO DO EVENTO

### 1️⃣ FASE 1 — TODOS CONTRA TODOS

Todos os participantes se enfrentam entre si em confrontos **MD3**. Vence o confronto quem ganhar primeiro **2 partidas**.

Ao final, os **2 melhores colocados** avançam.

### 📊 CLASSIFICAÇÃO

1. **Número de confrontos vencidos**
2. **Total de rounds ganhos**, em caso de empate
3. Persistindo empate, partida extra em **MD1**

---

### 2️⃣ FASE 2 — GRANDE FINAL

O **1º colocado** enfrenta o **2º colocado** em uma **MD5**. Vence quem ganhar primeiro **3 partidas**.

🏆 O vencedor garante a **Phantom Champions 2026**.

---

### 3️⃣ FASE 3 — CHEFÃO FINAL

O campeão enfrenta **Zacarias** em uma **MD3**.

👑 Se vencer, leva o **pacote completo Champions 2026**.

Se perder, continua com a **Phantom Champions 2026**.
```

## 9.2 Mensagem 2 — regras oficiais

```md
# ⚔️ REGRAS OFICIAIS

Cada partida da série vai até alguém conquistar **10 rounds**.

### 🔫 ARMAS

- **1º round:** somente **Sheriff**
- **Do 2º round em diante:** somente **Vandal**
- A **faca** é permitida em qualquer round

### 🔪 REGRA DA FACA

Se alguém matar de faca, vence **imediatamente aquela partida da série**.

A kill de faca não encerra toda a MD3 ou MD5: ela vale **1 vitória de partida**.

Em vitória antecipada, o vencedor recebe **10 rounds** e o perdedor mantém os rounds que já tinha.

### ⚠️ PLACAR 9x9

Se chegar a **9x9**, o round decisivo será obrigatoriamente **somente na faca**.

### 🚫 QUEBRA DE REGRA

Qualquer descumprimento causa derrota automática naquela partida.

O adversário recebe **1 vitória de partida** e **10 rounds**; o infrator mantém os rounds que já tinha.

## 👑 QUE VENÇA O MELHOR!
```

---

# 10. DIREÇÃO VISUAL CONSOLIDADA

## 10.1 Estética geral

- Visual premium, cinematográfico e exagerado.
- Identidade inspirada em Champions/Valorant.
- Paleta predominante:
  - preto;
  - vermelho;
  - dourado;
  - branco nos itens do pacote.
- Sensação de grande evento, luxo, palco, tronos, refletores e competição.
- O banner principal não precisa conter todas as regras; ele é prioritariamente visual.
- As regras e o formato ficam no site e nos textos do Discord.

## 10.2 Zacarias

- Representação inspirada no Chamber.
- Homem elegante, óculos, postura confiante.
- Cartola.
- Pode aparecer como apresentador/host e chefão final.

## 10.3 Tapioca

A referência visual enviada pelo usuário é uma lagarta/personagem verde com:

- corpo segmentado de lagarta;
- pele verde-oliva;
- olhos grandes com íris azuladas;
- expressão séria, desconfiada ou intimidadora;
- rosto alongado e nariz proeminente;
- cigarro na boca;
- fumaça;
- aparência de personagem 3D antigo/meme.

Ao humanizá-lo:

- preservar claramente o rosto e as características da lagarta;
- usar corpo/roupa de homem elegante;
- colocar cartola;
- manter o cigarro e a expressão;
- identificar como **Tapioca — Co-owner do evento**.

## 10.4 Garotinhas de anime / meme interno

- Personagens de anime ao redor dos anfitriões.
- Visual fofo, animado e exagerado.
- Uma ou duas podem pedir skin em balões de fala.
- Frases já usadas ou sugeridas:
  - “Eu quero skin, papai, por favor.”
  - “Me dá a Phantom!”
  - “Ganha pra mim, Tapioca?”
  - “Essa Phantom é linda.”
- Uma personagem pode aparecer ajoelhada, mãos juntas, olhando para cima.
- O conjunto deve funcionar como meme interno, sem dominar o título ou o prêmio.

## 10.5 Pacote Champions 2026 — correção visual obrigatória

Uma arte anterior utilizou armas incorretas. Futuras artes devem respeitar a referência enviada pelo usuário para o pacote real.

Características visuais da referência:

- **Phantom Champions 2026**;
- versões/efeitos em branco, dourado, preto e vermelho;
- melee em formato de **leque dobrável**;
- não inventar uma Vandal ou outros rifles como se fossem parte principal do pacote;
- não substituir o leque por faca tradicional.

## 10.6 Chaveiro do Tapioca — elemento aprovado

O usuário gostou especialmente do pequeno chaveiro com a lagartinha do Tapioca pendurado no conjunto/prêmio.

Esse elemento deve ser preservado como easter egg recorrente em novas artes:

- miniatura reconhecível do Tapioca;
- aparência de chaveiro/buddy;
- pode ficar pendurado na arma ou no expositor;
- deve ser engraçado, mas visualmente integrado ao acabamento premium.

## 10.7 Nome no banner

Usar:

# **SUPER SKIN CHALLENGE**

Não usar “do Zacarias”.

## 10.8 Política de criação de imagens para o site

- Qualquer nova imagem rasterizada deve ser criada do zero.
- Artes anteriores podem servir como referência conceitual, não como obrigação de reutilização.
- SVG pode ser usado para ícones, fluxos, emblemas e elementos de interface.
- Ilustrações importantes devem ser geradas no ChatGPT e depois entregues ao fluxo de desenvolvimento.

---

# 11. ANIMAÇÃO DO BANNER — KLING

Foi discutida a criação de uma animação curta para o banner, com aproximadamente 5 a 7 segundos.

## Configuração recomendada

- Ferramenta: **Kling**.
- Modelo testado/selecionado: **Kling 4.0**.
- Modo: Image-to-video / Keyframes.
- Usar o banner como primeiro quadro.
- Proporção: **16:9** ou Auto preservando a imagem.
- Resolução disponível sem VIP: **720p**.
- Duração recomendada: **5 a 6 segundos**.
- Quantidade: 1 geração inicial.
- Câmera fixa.
- Movimento muito sutil para reduzir deformações.

## Movimentos desejados

- fumaça dos cigarros subindo;
- luzes douradas cintilando;
- pequenos reflexos nos metais;
- respiração e piscadas discretas;
- leve movimento de cabelo/roupa das personagens;
- chaveiro do Tapioca balançando suavemente;
- sem grandes pulos;
- sem mover ou transformar armas;
- sem zoom, pan ou cortes.

## Prompt em inglês já preparado

```text
Use @Image1 as the first frame and the exact reference for the entire composition. Animate this banner for 6 seconds in a single continuous shot with a completely locked-off camera.

Preserve the original visual style, full framing, colors, characters, outfits, top hats, thrones, and every object in the image. The result should look like the same poster subtly coming to life, not a new scene or a reinterpretation.

MOTION:
Smoke from the existing cigarettes slowly rises in thin, delicate wisps, without obscuring any faces or text.
The golden background lights gently shimmer, with subtle reflections traveling across the metallic details of the thrones and prizes.
Both hosts remain in their original poses, with very subtle breathing and a natural blink. No speaking or gesturing.
The surrounding anime characters show small, cheerful reactions: occasional blinking, slight head and shoulder movements, and very gentle hair movement. Keep their hands in their original positions. No large jumps or changes in position.
The dangling Tapioca caterpillar keychain sways very slightly. All objects resting on the table remain stationary.

PRESERVATION:
Keep every letter, word, sign, and logo exactly as shown in the original image, stationary and clearly readable throughout the entire video. Do not redraw, replace, translate, or animate the typography. Preserve all existing Portuguese text unchanged.
Strictly preserve the shapes, number, colors, and positions of the weapons and folding fan. Do not move, transform, or fire the weapons.
Keep all faces, hands, anatomy, and proportions consistent with the original image. Do not add characters or objects.

CAMERA AND PACING:
Completely static camera. No zoom, panning, rotation, camera shake, or perspective changes. No cuts, transitions, strong flashes, or scene changes.
All movements should be small, smooth, slow, and continuous.
Begin and end with the entire original composition visible. No fade-in or fade-out.

AUDIO:
No dialogue, narration, music, or sound effects.
```

---

# 12. DECISÕES ANTIGAS QUE FORAM SUPERADAS

Esta seção existe para impedir que uma IA recupere versões erradas da conversa.

## Descartado: todos enfrentarem Zacarias na primeira fase

A proposta original era cada participante tirar X1 contra Zacarias e só avançar se o derrotasse. Isso foi abandonado.

Formato vigente: participantes se enfrentam entre si na Fase 1; Zacarias aparece somente na Fase 3.

## Descartado: faca vencer o confronto inteiro

Em versões iniciais, uma kill de faca poderia significar vitória automática em toda a disputa.

Formato vigente: a faca vence apenas a **partida atual da série**.

## Descartado: Sheriff no primeiro round e “Vandal ou faca” como armas equivalentes comuns

A formulação atual é mais precisa:

- primeiro round: Sheriff como arma de fogo;
- do segundo em diante: Vandal como arma de fogo;
- faca é exceção permitida em qualquer round e tem efeito especial.

## Descartado: desempate por saldo de partidas, saldo de rounds ou decisão arbitrária

Os critérios confirmados pelo usuário são:

1. confrontos vencidos;
2. total de rounds ganhos;
3. partida extra em MD1, se a igualdade continuar.

## Descartado: nome “Super Skin Challenge do Zacarias”

Nome vigente: **Super Skin Challenge**.

## Descartado: pacote visual com armas erradas

Futuras artes precisam usar a Phantom Champions 2026 e o leque correspondentes à referência real enviada pelo usuário.

---

# 13. CHECKLIST DE CONSISTÊNCIA

Antes de publicar texto, programar lógica ou gerar arte, confirmar:

- [ ] O nome aparece como **Super Skin Challenge**.
- [ ] Tapioca aparece como **co-owner**.
- [ ] A Fase 1 é todos contra todos em MD3.
- [ ] Os dois melhores avançam.
- [ ] A tabela ordena primeiro por confrontos vencidos.
- [ ] O primeiro desempate usa total de rounds ganhos.
- [ ] Persistindo empate, há partida extra em MD1.
- [ ] A Fase 2 é 1º × 2º em MD5.
- [ ] O vencedor da Fase 2 garante a Phantom.
- [ ] A Fase 3 é campeão × Zacarias em MD3.
- [ ] Derrotar Zacarias eleva o prêmio para o pacote completo.
- [ ] Perder para Zacarias não retira a Phantom.
- [ ] Primeiro round de cada partida usa Sheriff.
- [ ] Do segundo round em diante usa Vandal.
- [ ] A faca é permitida em qualquer round.
- [ ] Kill de faca vence somente a partida atual, não toda a série.
- [ ] Em encerramento por faca, o vencedor recebe 10 rounds e o perdedor mantém o placar real.
- [ ] Em 9x9, o round decisivo é somente na faca.
- [ ] Quebra de regra causa derrota na partida atual.
- [ ] Em vitória por punição, o vencedor recebe 10 rounds e o infrator mantém o placar real.
- [ ] O site distingue round, partida e série.
- [ ] O banner usa o pacote real: Phantom + leque.
- [ ] O chaveiro do Tapioca continua como easter egg.
- [ ] Nenhuma regra não confirmada foi inventada.

---

# 14. PRÓXIMO PASSO

O próximo passo não é começar a programar automaticamente.

Gustavo ainda vai explicar:

- como imagina o site;
- quais telas/páginas existirão;
- como os resultados serão inseridos;
- quem terá acesso administrativo;
- estilo visual da interface;
- comportamento da tabela e das fases;
- hospedagem, stack e publicação;
- quais imagens serão necessárias.

Depois dessa especificação, o contexto deve ser atualizado e transformado em um plano de implementação para Claude Code.

---

# 15. REGRA-MESTRA PARA CONTINUIDADE

Em caso de conflito entre qualquer resumo antigo e este documento, usar este documento como referência atual.

Em caso de dúvida não resolvida aqui, perguntar a Gustavo em vez de inventar.

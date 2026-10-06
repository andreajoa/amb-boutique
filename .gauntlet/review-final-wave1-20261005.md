# Revisão independente — primeira onda final — 2026-10-05

**Resultado: PASS para as 15 imagens novas inspecionadas: oito costas e sete frentes Calienne. Nenhum BLOCKER ou MAJOR visual encontrado nesta onda.** As oito frentes anteriores não são reclassificadas neste receipt. Aprovação por arquivo/ângulo, sem aprovar galerias completas ainda ausentes.

## Escopo e critério vigente

Revisor independente: gallery_review. Manifesto lido: `output/imagegen/amb-oct05-final/gallery-results.json`, snapshot updatedAt `2026-10-05T21:23:54.693Z`. Inspeção individual dos pixels de todos os 15 novos finais e das referências selecionadas com `view_image`; comparação adicional com as seis frentes físicas Elowyn, a traseira física da mesma família, a frente física Calienne e a frente física Elaris. Não houve geração, alteração de catálogo/manifesto ou publicação pelo revisor.

Padrões consultados: README da loja canônica, `docs/CATALOG-STANDARDIZATION-PROGRESS.md` do worktree e `.gauntlet/rubric.md`. A exigência local anterior de fotografia traseira verificada para toda cor foi expressamente substituída pela instrução do usuário: “voce temq ue gerar se nao tem gere - tente chegar ao maximo proximo do que pdoe ser o rpoduto nas costas”. A autorização está registrada em `output/imagegen/amb-oct05-final/user-direction.json`, incluindo “Do not represent inferred rear as physically verified”.

Assim, as **oito costas deste receipt são reconstruções aproximadas autorizadas**, não fotografias comprovadas das costas de cada variante. Preservação de construção conhecida, cor, motivos, forro e soluções simples continua obrigatória. As sete cores Calienne são renderizações aproximadas orientadas pelos swatches oficiais; o swatch não comprova tonalidade de tecido fotografado. Essa limitação não é transformada em rejeição sob o critério atual.

## Evidências físicas e de cor

Elowyn, AliExpress `3256809742511895`: fotos físicas `verified-colour-photos/{rose-red,brown-1,burgundy,black,fuchsia,dark-brown}-supplier-full.jpg`, mais costas físicas `additional-seller-references/eastsupplier-02.jpg`. A referência traseira da mesma família sustenta gola fechada, mangas ajustadas, punhos amplos, franzido traseiro central/encaixe na região dos quadris e coluna maxi levemente aberta na barra; a cor e os motivos vêm de cada frente exata, não dessa referência preta. O forro contínuo curto é também comparado com o styling das frentes AMB aprovadas. Nas fontes fuchsia/dark-brown, extensão exata do forro traseiro não é comprovada fisicamente e permanece inferência.

Calienne, AliExpress `3256811405926531`: fonte física `export/amb-boutique/produtos/womens-2-piece-rhinestone-suit-blazer-and-pants-set/imagens/originais/03.webp`; frente AMB Taupe corrigida `front-20261005-v2.webp`. Blazer aberto, lapelas longas, folhas/cristais em lapelas/punhos, cintura alta ornamentada e barras de calça ampla. Fonte de cor: `native-video-colour-evidence.json` no diretório de evidência do mesmo produto — Blue #0080ff, Red #ff0000, GRAY #999999, green #007000, Khaki #dac9b9, Orange #ffa500, Pink #ffc0cb. O terno cinza liso do vídeo genérico não foi usado como evidência de construção.

Elaris, AliExpress `3256812807042028`: fonte física `export/amb-boutique/produtos/ranadoo-a-line-prom-dress-with-ruffles-and-pleats/imagens/originais/01.webp` mais frente AMB aprovada. Construção conhecida: sem alças, corpo pregueado e saia A-line amarelo manteiga com cascatas verticais de babados.

## Verificação técnica e acabamento comum

Os 15 arquivos decodificam como **WebP, 1600 × 1600, RGB**. SHA-256 foi recalculado a partir de cada arquivo e coincide com o manifesto; hashes abaixo identificam exatamente o conteúdo aprovado. Nenhum desses arquivos contém perfil ICC embutido, portanto RGB sozinho não demonstra etiqueta sRGB. A exportação sRGB é informação de preparação/proveniência; esta checagem não a apresenta como perfil embutido.

Todos têm fundo de estúdio marfim, enquadramento frontal ou traseiro correspondente e roupa completa sem cortar punhos/barra. Não há acessórios novos. **MINOR:** margem superior/inferior apertada em vários quadros, compatível com a frente já aprovada e sem corte da roupa. Nenhuma correção obrigatória nesta onda; eventual respiro extra deve ser aplicado de forma consistente à galeria, sem alterar a peça.

## Decisão por arquivo

### elowyn-ruched-mesh-maxi-dress-rose-floral — back — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/elowyn-ruched-mesh-maxi-dress-rose-floral/back-20261005-final.webp`

SHA-256: `afbf5bd609c7c9e6b54adff906387b70cc13af395fae8aa0b7a0884011898946`

Rosa vivo com ramos/florzinhas pretos, não as rosas grandes do outro modelo. Forro preto contínuo sob a malha rosa, encerrado aproximadamente no joelho; parte inferior translúcida. Gola fechada, mangas ajustadas com punhos amplos, franzido central traseiro e comprimento maxi coerentes com a geometria física da família.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/elowyn-ruched-mesh-maxi-dress-rose-floral/front-20261005.webp`
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-evidence-2026-10-04/3256809742511895/additional-seller-references/eastsupplier-02.jpg`
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-evidence-2026-10-04/3256809742511895/verified-colour-photos/rose-red-supplier-full.jpg`

### elowyn-ruched-mesh-maxi-dress-brown-print — back — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/elowyn-ruched-mesh-maxi-dress-brown-print/back-20261005-final.webp`

SHA-256: `8e08e75981bbdbb890629728bec55f73ece676bdfe6ddaa1152d4d5247a08e97`

Fundo castanho e pequenos motivos botânicos pretos preservados. Camada opaca castanha contínua no tronco/quadris até aproximadamente o joelho; pernas sob malha translúcida depois dessa borda. Sem transformação em forro até o chão ou mudança de punho/gola.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/elowyn-ruched-mesh-maxi-dress-brown-print/front-20261005.webp`
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-evidence-2026-10-04/3256809742511895/additional-seller-references/eastsupplier-02.jpg`
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-evidence-2026-10-04/3256809742511895/verified-colour-photos/brown-1-supplier-full.jpg`

### elowyn-ruched-mesh-maxi-dress-burgundy — back — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/elowyn-ruched-mesh-maxi-dress-burgundy/back-20261005-final.webp`

SHA-256: `5a15180bd11c454b24deeed1dc2072d73cd23ba9f520066accb8d35020e91502`

Vinho com pontos pretos regulares, mantendo a estampa frontal. Forro vinho contínuo e curto sob a malha, com saia inferior translúcida. Costas fechadas e franzido traseiro central coerentes com a família.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/elowyn-ruched-mesh-maxi-dress-burgundy/front-20261005.webp`
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-evidence-2026-10-04/3256809742511895/additional-seller-references/eastsupplier-02.jpg`
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-evidence-2026-10-04/3256809742511895/verified-colour-photos/burgundy-supplier-full.jpg`

### elowyn-ruched-mesh-maxi-dress-black-mesh — back — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/elowyn-ruched-mesh-maxi-dress-black-mesh/back-20261005-final.webp`

SHA-256: `b0113e51677776e24d744b95e52c467f26bdb9a5654f4220ca27eebe9ee99ae7`

Malha preta com pontos claros pequenos e regulares, mantendo o desenho da fonte e da frente v2. Forro preto contínuo no corpo/quadris até o joelho; não reaparece a abertura transparente da cintura rejeitada na frente v1. Parte inferior translúcida, gola alta traseira e punhos amplos.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/elowyn-ruched-mesh-maxi-dress-black-mesh/front-20261005-v2.webp`
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-evidence-2026-10-04/3256809742511895/additional-seller-references/eastsupplier-02.jpg`
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-evidence-2026-10-04/3256809742511895/verified-colour-photos/black-supplier-full.jpg`

### elowyn-ruched-mesh-maxi-dress-fuchsia — back — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/elowyn-ruched-mesh-maxi-dress-fuchsia/back-20261005-final.webp`

SHA-256: `c9154b607ce1e6a4ff6d9807d166022fd68970d1c29ef298ad4b6b1c029b41fb`

Fúcsia vivo com desenho ornamental/floral tonal, sem substituir por estampa preta de outra cor. Camada opaca fúcsia escura contínua até aproximadamente o joelho, compatível com o styling frontal aprovado; o comprimento exato do forro traseiro continua sendo inferência. Gola, manga, punho e maxi preservados.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/elowyn-ruched-mesh-maxi-dress-fuchsia/front-20261005.webp`
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-evidence-2026-10-04/3256809742511895/additional-seller-references/eastsupplier-02.jpg`
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-evidence-2026-10-04/3256809742511895/verified-colour-photos/fuchsia-supplier-full.jpg`

### elowyn-ruched-mesh-maxi-dress-leopard — back — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/elowyn-ruched-mesh-maxi-dress-leopard/back-20261005-final.webp`

SHA-256: `2111e13a2b9805542cd67c9334c80c678e3e64ca2a5919c917b92a1ec4c5fa31`

Castanho escuro com filigrana/paisley botânica preta densa, fiel à foto dark-brown: o slug histórico leopard não foi tomado como autorização para inventar manchas de animal. Forro castanho curto e contínuo compatível com a frente aprovada; comprimento traseiro do forro é inferido. Costura central simples, sem hardware inventado.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/elowyn-ruched-mesh-maxi-dress-leopard/front-20261005.webp`
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-evidence-2026-10-04/3256809742511895/additional-seller-references/eastsupplier-02.jpg`
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-evidence-2026-10-04/3256809742511895/verified-colour-photos/dark-brown-supplier-full.jpg`

### elaris-ruffle-gown-butter-yellow — back — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/elaris-ruffle-gown-butter-yellow/back-20261005-final.webp`

SHA-256: `76d44b1efa75878ad58c724ee64b845b71bee6deb824de95287e8db20b1824a6`

Amarelo manteiga, mesma modelo de cabelo preso e saia A-line com babados verticais em cascata. Corpo traseiro fechado sem alças, com pregas suaves e costura central discreta: solução aproximada simples. Sem babados horizontais, pedrarias, fenda ou acessório novo; cabeça e barra completas.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/elaris-ruffle-gown-butter-yellow/front-20261005.webp`

### calienne-rhinestone-suit-taupe — back — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/calienne-rhinestone-suit-taupe/back-20261005-final.webp`

SHA-256: `281de343f4f35859a951a31544f9ae953421e2c3608620e2d117e14e9be848b9`

Taupe/greige e comprimento do blazer/calça preservados. Costas de alfaiataria simples com costuras de modelagem; punhos e barras mantêm grupos de folhas/cristais. Sem aplique novo nas costas, botões traseiros ou abertura decorativa. A cintura é coberta pelo blazer, não se inventou faixa de cristais traseira.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/calienne-rhinestone-suit-taupe/front-20261005-v2.webp`

### calienne-rhinestone-suit-blue — front — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/calienne-rhinestone-suit-blue/front-20261005-final.webp`

SHA-256: `914e0d4e2f043d311b62f7e549fe7634583ecdac4363bce7385ecd00b1a35aa6`

Azul compatível com swatch Blue #0080ff sob iluminação de estúdio. Mesmo corte da frente Taupe v2: frente aberta, lapelas longas, calça reta ampla e grupos de folhas/cristais nas lapelas, punhos, cintura e barras.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/calienne-rhinestone-suit-taupe/front-20261005-v2.webp`

### calienne-rhinestone-suit-red — front — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/calienne-rhinestone-suit-red/front-20261005-final.webp`

SHA-256: `b240ccbb44fd48e4fb1488ee3a57f992f466658594d44674d3f11a428cd26b14`

Vermelho compatível com swatch Red #ff0000. Frente aberta sem os dois fechos redondos rejeitados; corte, lapelas, punhos, cintura e barras ornamentadas preservados.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/calienne-rhinestone-suit-taupe/front-20261005-v2.webp`

### calienne-rhinestone-suit-grey — front — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/calienne-rhinestone-suit-grey/front-20261005-final.webp`

SHA-256: `b26bf9591d3dd66051355d10b57a6a7293dda63f986431636be0ed1c6b25d18a`

Cinza compatível com swatch GRAY #999999. Mesmo conjunto ornamentado real, sem adotar o terno liso do vídeo genérico rejeitado. Frente aberta, mesmos grupos de folhas/cristais e calça reta ampla.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/calienne-rhinestone-suit-taupe/front-20261005-v2.webp`

### calienne-rhinestone-suit-forest — front — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/calienne-rhinestone-suit-forest/front-20261005-final.webp`

SHA-256: `a28faaf8c6ab06c9f0e5aa034c66c10ce6a95389d53d1288653cad52df8d40a7`

Verde profundo compatível com swatch green #007000. Geometria frontal, abertura do blazer e decoração localizada mantidas; sem fecho, acessório ou desenho novo.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/calienne-rhinestone-suit-taupe/front-20261005-v2.webp`

### calienne-rhinestone-suit-khaki — front — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/calienne-rhinestone-suit-khaki/front-20261005-final.webp`

SHA-256: `ca8f1bb7ce4e6847e2e8e24af5bc9a58ba69d89bf1a000526e18242396439693`

Bege claro compatível com swatch Khaki #dac9b9, distinguível do Taupe. Mesmo corte aberto e mesmos grupos ornamentais em lapelas, punhos, cintura e barras.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/calienne-rhinestone-suit-taupe/front-20261005-v2.webp`

### calienne-rhinestone-suit-orange — front — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/calienne-rhinestone-suit-orange/front-20261005-final.webp`

SHA-256: `e19ca90a6bbb28e702f5cbf6e2482cce0b46160b74cdf5cf89227e31eae351b8`

Laranja compatível com swatch Orange #ffa500. Mesma frente aberta e calça ampla do Taupe v2; folhas/cristais conservados nos pontos conhecidos, sem botão novo.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/calienne-rhinestone-suit-taupe/front-20261005-v2.webp`

### calienne-rhinestone-suit-blush — front — PASS

Arquivo: `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-final/assets/calienne-rhinestone-suit-blush/front-20261005-final.webp`

SHA-256: `e9ef21035024943fa3c157f6b83f4ecbcdeb250a2c2acf01fa7b5f65e69483f1`

Rosa claro compatível com swatch Pink #ffc0cb. Mesmo corte, abertura, lapelas e grupos de folhas/cristais do Taupe v2; sem fechamento reinventado.

Referências de comparação deste registro:
- `/Users/andrealmeida/Downloads/Organizados/Projetos/AMB-Boutique/amb-product-batch-2026-10-04/output/imagegen/amb-oct05-continuation/assets/calienne-rhinestone-suit-taupe/front-20261005-v2.webp`

## Limite da aprovação

Este receipt aprova somente os 15 arquivos/hash acima sob o critério vigente. Não confirma detalhes traseiros físicos ausentes, nem transforma swatches em fotos de tecido. Os ângulos laterais e demais costas Calienne ainda não presentes nesta primeira onda deverão receber inspeção independente própria. Nenhum dos 23 produtos ativos foi alterado pelo revisor.

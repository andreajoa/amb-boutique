# AMB Boutique — pacote final preparado

Os 15 produtos restantes estão integrados na versão local, com 60 imagens novas no padrão AMB e aprovação independente por hash. O lote completo tem 38 produtos: 23 publicados e 15 preparados localmente. O catálogo local tem 482 produtos; o publicado tem 467. Os 444 produtos anteriores e os 23 já publicados foram preservados integralmente.

Build, TypeScript, lint e testes de catálogo, variantes, integração de leitura do Manager, preços por tamanho e avisos de preparação passaram. Uma segunda revisão confirmou os 482 produtos realmente serializados no HTML da homepage compilada, incluindo os 15 novos registros, as 60 imagens selecionadas e os nove avisos de preparação. Os testes não criaram pagamentos, pedidos ou emails reais.

As oito cores Calienne informam preparação de aproximadamente 3–15 dias úteis antes do envio; Elaris informa produção de aproximadamente 10–30 dias antes do envio. O prazo de transporte é adicional. Os mesmos avisos vêm do catálogo no produto, carrinho, checkout e confirmação. Preservados preços, pesos, limites de frete e comportamento dos produtos sem aviso.

O servidor local não pôde abrir a porta: `listen EPERM 127.0.0.1:3048`. As páginas de produto dependem de execução do servidor. Portanto, renderização das 15 páginas, galerias no navegador, carrinho, reload e início de compra dessa versão permanecem sem verificação runtime. Não foram produzidos screenshots dessas páginas.

A tag Pinterest está no código publicado pela PR47, commit `18c107401d405aec294ff162203fcb3e4c11d96f`. A Vercel confirmou o deploy de produção `dpl_BrfRDCbnkgj44eZCvXNspYRWiaUx` como READY, com `ambboutique.online` e `www.ambboutique.online`. O usuário foi avisado de que pode clicar em **Claim my website**, com a limitação explícita de que esta sessão não conseguiu ler diretamente o HTML público. A reivindicação da conta Pinterest não foi executada. A versão local preserva exatamente a mesma tag.

A aprovação automática rejeitou a criação de branch e a atualização de arquivos no GitHub: essas ações exigem aprovação, mas esta sessão está configurada com `approval_policy=never`. Os 15 novos produtos não foram publicados. O plano de 15 vínculos de fornecedor e 100 SKUs padrão do Manager também não foi aplicado. Não houve alteração de estoque ou nova rodada de repricing.

Para concluir: publicar o pacote revisado quando a escrita estiver disponível; verificar as 15 páginas e 60 imagens públicas; sincronizar o catálogo de 482 produtos com o Manager e aplicar os 100 vínculos padrão preservando os existentes; atualizar o estoque do fornecedor; verificar o início de compra e os avisos sem efetuar pagamento. Não regenerar as 60 imagens aprovadas nem repetir o repricing dos 253 SKUs.

Evidências principais:

- `.gauntlet/final-gallery-approval-20261005.json`: aprovação independente das 60 imagens selecionadas.
- `.gauntlet/review-final-catalogue-data-20261005.json`: dados, preservação, imagens e SKUs conferidos.
- `.gauntlet/review-final-built-html-20261005.json`: catálogo efetivamente serializado no build.
- `.gauntlet/review-final-local-browser-20261005.md`: limitação runtime registrada.
- `.gauntlet/pinterest-production-verification-20261005.json`: código e deploy publicados do Pinterest.
- `output/imagegen/amb-oct05-final/gallery-results.json`: prompts, referências e arquivos selecionados.
- `output/imagegen/amb-oct05-final/catalogue-candidate-plan.json`: integração local e hashes.
- `output/imagegen/amb-oct05-final/manager-binding-candidate-plan.json`: vínculos preparados, não aplicados.

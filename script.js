// ==========================================================================
// CONFIGURAÇÃO DO SUPABASE (Substitua pelos seus dados quando criar a conta)
// ==========================================================================
const SUPABASE_URL = "SUA_URL_DO_SUPABASE_AQUI";
const SUPABASE_KEY = "SUA_CHAVE_ANON_DO_SUPABASE_AQUI";

// Inicializa o Supabase (Só ativa se você mudar as constantes acima)
let supabase = null;
if (SUPABASE_URL !== "SUA_URL_DO_SUPABASE_AQUI") {
    supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ==========================================================================
// SELEÇÃO DE ELEMENTOS DO HTML
// ==========================================================================
const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const step3 = document.getElementById('step-3');

const dot1 = document.getElementById('step-dot-1');
const dot2 = document.getElementById('step-dot-2');
const dot3 = document.getElementById('step-dot-3');

const formCadastro = document.getElementById('form-cadastro');
const formComprovante = document.getElementById('form-comprovante');
const inputWhatsapp = document.getElementById('whatsapp');
const inputComprovante = document.getElementById('comprovante');
const dropZone = document.getElementById('drop-zone');
const fileInfo = document.getElementById('file-info');

// Objeto global para guardar os dados do Passo 1 antes de enviar no Passo 2
let dadosCliente = {};

// ==========================================================================
// MÁSCARA DO WHATSAPP (Formata automaticamente enquanto digita)
// ==========================================================================
inputWhatsapp.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove tudo que não for número
    
    if (value.length > 11) value = value.slice(0, 11); // Limita a 11 dígitos
    
    // Aplica a máscara dinamicamente
    if (value.length > 6) {
        e.target.value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
        e.target.value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
        e.target.value = `(${value.slice(0, 2)}`;
    }
});

// ==========================================================================
// PASSO 1: VALIDAÇÃO E TRANSIÇÃO PARA O PASSO 2
// ==========================================================================
formCadastro.addEventListener('submit', (e) => {
    e.preventDefault(); // Impede a página de recarregar

    // Captura os valores limpando espaços extras
    const nome = document.getElementById('nome').value.trim();
    const sobrenome = document.getElementById('sobrenome').value.trim();
    const whatsapp = inputWhatsapp.value.trim();
    const cidade = document.getElementById('cidade').value.trim();
    const estado = document.getElementById('estado').value;

    // Trava de segurança contra "engraçadinhos" que tentam burlar pelo inspecionar elemento
    if (!nome || !sobrenome || whatsapp.length < 14 || !cidade || !estado) {
        alert("⚠️ Por favor, preencha todos os campos corretamente!");
        return;
    }

    // Salva os dados na memória para usar no passo final
    dadosCliente = { nome, sobrenome, whatsapp, cidade, estado };

    // Transição visual gamer de telas
    step1.classList.remove('active');
    step2.classList.add('active');
    
    // Atualiza o indicador de etapas lá no topo
    dot1.classList.add('completed');
    dot2.classList.add('active');
});

// ==========================================================================
// GERENCIAMENTO DA ÁREA DE UPLOAD (DRAG & DROP E CLIQUE)
// ==========================================================================

// Abrir seletor de arquivos ao clicar na caixa
dropZone.addEventListener('click', () => inputComprovante.click());

// Atualizar o texto quando o usuário escolhe o arquivo
inputComprovante.addEventListener('change', (e) => {
    verificarArquivo(e.target.files[0]);
});

// Efeitos visuais de arrastar o arquivo por cima da caixa
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    }, false);
});

// Quando o usuário solta o arquivo na caixa
dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    inputComprovante.files = dt.files; // Sincroniza o arquivo arrastado com o formulário
    verificarArquivo(file);
});

// Função que valida o tamanho e o tipo do arquivo
function verificarArquivo(file) {
    if (!file) return;

    // Validar tamanho (1MB = 1048576 bytes)
    if (file.size > 1048576) {
        alert("⚠️ Arquivo muito grande! O limite máximo permitido é 1MB.");
        inputComprovante.value = ""; // Limpa o arquivo
        fileInfo.innerText = "Nenhum arquivo selecionado (Máx: 1MB)";
        return;
    }

    // Se passou na validação, mostra o nome do arquivo na tela
    fileInfo.innerHTML = `✅ Arquivo pronto: <strong>${file.name}</strong>`;
}

// ==========================================================================
// PASSO 2: ENVIO DE TUDO E TELA DE AGRADECIMENTO (CONEXÃO SUPABASE)
// ==========================================================================
formComprovante.addEventListener('submit', async (e) => {
    e.preventDefault();

    const arquivo = inputComprovante.files[0];

    // Trava de segurança rigorosa
    if (!arquivo) {
        alert("⚠️ O envio do comprovante é obrigatório para continuar!");
        return;
    }

    const btnEnviar = document.getElementById('btn-enviar-tudo');
    btnEnviar.innerText = "ENVIANDO... AGUARDE";
    btnEnviar.disabled = true;

    // Gerar o nome do arquivo do jeito que você pediu: Nome_Sobrenome_Cidade.extensao
    const extensao = arquivo.name.split('.').pop();
    // Limpa espaços e formata o nome do arquivo de forma segura
    const nomeArquivoLimpo = `${dadosCliente.nome}_${dadosCliente.sobrenome}_${dadosCliente.cidade}`.replace(/\s+/g, '_').toLowerCase();
    const nomeFinalDoArquivo = `${nomeArquivoLimpo}.${extensao}`;

    // --- SE O SUPABASE ESTIVER CONFIGURADO ---
    if (supabase) {
        try {
            // 1. Faz o Upload do Comprovante para o Storage do Supabase (Pasta 'comprovantes')
            const { data: storageData, error: storageError } = await supabase
                .storage
                .from('comprovantes')
                .upload(nomeFinalDoArquivo, arquivo, { upsert: true });

            if (storageError) throw storageError;

            // Pega o link público da imagem gerada no storage
            const { data: urlData } = supabase.storage.from('comprovantes').getPublicUrl(nomeFinalDoArquivo);
            const comprovanteUrl = urlData.publicUrl;

            // 2. Insere os dados de Texto + o Link do Comprovante na Tabela 'clientes_pre_venda'
            const { error: dbError } = await supabase
                .from('clientes_pre_venda')
                .insert([
                    {
                        nome: dadosCliente.nome,
                        sobrenome: dadosCliente.sobrenome,
                        whatsapp: dadosCliente.whatsapp,
                        cidade: dadosCliente.cidade,
                        estado: dadosCliente.estado,
                        comprovante_url: comprovanteUrl
                    }
                ]);

            if (dbError) throw dbError;

        } catch (error) {
            alert("Erro ao enviar dados: " + error.message);
            btnEnviar.innerText = "CONCLUIR INSCRIÇÃO";
            btnEnviar.disabled = false;
            return;
        }
    } else {
        // --- MODO SIMULAÇÃO (Roda se você ainda não configurou o Supabase) ---
        console.log("Modo Simulação Ativo! Dados que seriam salvos:", dadosCliente);
        console.log("Nome do arquivo gerado para o sistema:", nomeFinalDoArquivo);
        // Pequeno delay para fingir o envio e dar um toque realista
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Finalização: Transição para a tela 3 (Agradecimento)
    step2.classList.remove('active');
    step3.classList.add('active');

    dot2.classList.add('completed');
    dot3.classList.add('active');
});

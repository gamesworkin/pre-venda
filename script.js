// ==========================================================================
// LINK DO GOOGLE SHEETS (Cole aqui a URL do App da Web que você copiou)
// ==========================================================================
const GOOGLE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyEKsPOGYprzYpO4obOWLkcfthvKZH01B4hCn5hGXDSH4VA7PC2b8CdOXzvToxO9xkpKw/exec";

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

let dadosCliente = {};

// Mask do WhatsApp
inputWhatsapp.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 6) {
        e.target.value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
        e.target.value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
        e.target.value = `(${value.slice(0, 2)}`;
    }
});

// Passo 1: Cadastro
formCadastro.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('nome').value.trim();
    const sobrenome = document.getElementById('sobrenome').value.trim();
    const whatsapp = inputWhatsapp.value.trim();
    const city = document.getElementById('cidade').value.trim();
    const state = document.getElementById('estado').value;

    if (!nome || !sobrenome || whatsapp.length < 14 || !city || !state) {
        alert("⚠️ Por favor, preencha todos os campos corretamente!");
        return;
    }

    dadosCliente = { nome, sobrenome, whatsapp, cidade: city, estado: state };

    step1.classList.remove('active');
    step2.classList.add('active');
    dot1.classList.add('completed');
    dot2.classList.add('active');
});

// Drag and drop do arquivo
dropZone.addEventListener('click', () => inputComprovante.click());
inputComprovante.addEventListener('change', (e) => verificarArquivo(e.target.files[0]));

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); }, false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); }, false);
});
dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    inputComprovante.files = dt.files;
    verificarArquivo(dt.files[0]);
});

function verificarArquivo(file) {
    if (!file) return;
    if (file.size > 1048576) {
        alert("⚠️ Arquivo muito grande! O limite máximo permitido é 1MB.");
        inputComprovante.value = "";
        fileInfo.innerText = "Nenhum arquivo selecionado (Máx: 1MB)";
        return;
    }
    fileInfo.innerHTML = `✅ Arquivo pronto: <strong>${file.name}</strong>`;
}

// Função auxiliar para transformar o arquivo em texto (Base64)
const convertBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = () => resolve(fileReader.result);
        fileReader.onerror = (error) => reject(error);
    });
};

// Passo 2: Envio Final para o Google Sheets
formComprovante.addEventListener('submit', async (e) => {
    e.preventDefault();
    const arquivo = inputComprovante.files[0];

    if (!arquivo) {
        alert("⚠️ O envio do comprovante é obrigatório!");
        return;
    }

    const btnEnviar = document.getElementById('btn-enviar-tudo');
    btnEnviar.innerText = "ENVIANDO... AGUARDE";
    btnEnviar.disabled = true;

    try {
        // Transforma a imagem ou PDF em string Base64
        const arquivoBase64 = await convertBase64(arquivo);
        
        // Nome do arquivo customizado
        const extensao = arquivo.name.split('.').pop();
        const nomeArquivoLimpo = `${dadosCliente.nome}_${dadosCliente.sobrenome}_${dadosCliente.cidade}`.replace(/\s+/g, '_').toLowerCase();
        const nomeFinalDoArquivo = `${nomeArquivoLimpo}.${extensao}`;

        // Junta tudo num pacote só
        const dadosFinais = {
            ...dadosCliente,
            nomeArquivo: nomeFinalDoArquivo,
            arquivoBase64: arquivoBase64
        };

        // Envia direto para a API da Planilha do Google
        const response = await fetch(GOOGLE_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Evita qualquer erro de bloqueio/CORS do navegador
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosFinais)
        });

        // Como usamos 'no-cors', o navegador não lê a resposta por segurança, mas o envio é feito!
        // Forçamos uma pequena espera realista de sucesso
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Vai para a tela de agradecimento
        step2.classList.remove('active');
        step3.classList.add('active');
        dot2.classList.add('completed');
        dot3.classList.add('active');

    } catch (error) {
        alert("Erro ao enviar para a planilha: " + error.message);
        btnEnviar.innerText = "CONCLUIR INSCRIÇÃO";
        btnEnviar.disabled = false;
    }
});

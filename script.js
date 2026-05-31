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
    
    // Se for PDF, o limite precisa ser rígido em 35KB para caber na célula do Sheets sem cortar
    if (file.type === "application/pdf" && file.size > 35840) {
        alert("⚠️ Para comprovantes em PDF, o arquivo deve ter no máximo 35KB.\n\nDica: Tire um print (foto) do comprovante e envie a imagem! Imagens são comprimidas automaticamente pelo nosso sistema.");
        inputComprovante.value = "";
        fileInfo.innerText = "Use uma imagem ou PDF de até 35KB";
        return;
    }
    
    // Limite geral para imagens (1MB)
    if (file.size > 1048576) {
        alert("⚠️ Imagem muito grande! O limite máximo permitido é 1MB.");
        inputComprovante.value = "";
        fileInfo.innerText = "Nenhum arquivo selecionado (Máx: 1MB)";
        return;
    }
    fileInfo.innerHTML = `✅ Arquivo pronto: <strong>${file.name}</strong>`;
}

// ==========================================================================
// COMPRESSOR INTELIGENTE DE IMAGENS E OTIMIZADOR DE BASE64
// ==========================================================================
const otimizarEConvertreParaBase64 = (file) => {
    return new Promise((resolve, reject) => {
        // Se for PDF, lê o arquivo original INTEIRO sem alterar nada
        if (file.type === "application/pdf") {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            return;
        }

        // Se for imagem, comprime dinamicamente
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                const MAX_WIDTH = 900;
                const MAX_HEIGHT = 900;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Reduzimos para 50% de qualidade para o texto ficar minúsculo e leve
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                resolve(dataUrl);
            };
        };
        reader.onerror = (error) => reject(error);
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
    btnEnviar.innerText = "PROCESSANDO E ENVIANDO...";
    btnEnviar.disabled = true;

    try {
        // Roda o otimizador
        const arquivoBase64Otimizado = await otimizarEConvertreParaBase64(arquivo);
        
        // REGRA DE SEGURANÇA CORRIGIDA:
        // Se for imagem, garante que está na margem segura. Se for PDF, não corta nada (envia inteiro)!
        let base64Final = arquivoBase64Otimizado;
        if (arquivo.type !== "application/pdf") {
            base64Final = arquivoBase64Otimizado.slice(0, 49000);
        }

        const extensao = arquivo.name.split('.').pop();
        const nomeArquivoLimpo = `${dadosCliente.nome}_${dadosCliente.sobrenome}_${dadosCliente.cidade}`.replace(/\s+/g, '_').toLowerCase();
        const nomeFinalDoArquivo = `${nomeArquivoLimpo}.${extensao}`;

        const dadosFinais = {
            ...dadosCliente,
            nomeArquivo: nomeFinalDoArquivo,
            arquivoBase64: base64Final
        };

        // Envia para o Google Sheets
        await fetch(GOOGLE_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosFinais)
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sucesso total
        step2.classList.remove('active');
        step3.classList.add('active');
        dot2.classList.add('completed');
        dot3.classList.add('active');

    } catch (error) {
        alert("Erro ao processar arquivo: " + error.message);
        btnEnviar.innerText = "CONCLUIR INSCRIÇÃO";
        btnEnviar.disabled = false;
    }
});

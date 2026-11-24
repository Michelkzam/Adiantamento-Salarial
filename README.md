# Adiantamento Salarial - App Mobile

Sistema de gerenciamento de adiantamento salarial com suporte para Android APK.

## 🚀 Funcionalidades

- ✅ Cadastro de funcionários
- ✅ Controle de adiantamentos salariais
- ✅ Geração de relatórios em PDF
- ✅ Interface responsiva
- ✅ Aplicativo nativo para Android

## 📱 Gerando APK para Android

### Pré-requisitos

1. **Node.js** (versão 16 ou superior)
2. **Android Studio** com SDK configurado
3. **Java JDK 11** ou superior

### Passos para gerar o APK

1. **Instalar dependências:**
```bash
npm install
```

2. **Construir o projeto:**
```bash
npm run build
```

3. **Inicializar Capacitor (primeira vez):**
```bash
npx cap init
```

4. **Adicionar plataforma Android:**
```bash
npx cap add android
```

5. **Sincronizar arquivos:**
```bash
npx cap sync
```

6. **Abrir no Android Studio:**
```bash
npx cap open android
```

7. **No Android Studio:**
   - Aguarde a sincronização do Gradle
   - Vá em `Build > Build Bundle(s) / APK(s) > Build APK(s)`
   - O APK será gerado em `android/app/build/outputs/apk/debug/`

### Scripts disponíveis

- `npm run dev` - Executar em modo desenvolvimento
- `npm run build` - Construir para produção
- `npm run android:build` - Construir e sincronizar para Android
- `npm run capacitor:sync` - Sincronizar arquivos com Capacitor
- `npm run capacitor:open` - Abrir projeto no Android Studio

## 🔧 Configuração do Ambiente Android

### 1. Instalar Android Studio
- Baixe e instale o [Android Studio](https://developer.android.com/studio)
- Configure o Android SDK (API 22 ou superior)

### 2. Configurar variáveis de ambiente
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 3. Aceitar licenças do SDK
```bash
$ANDROID_HOME/tools/bin/sdkmanager --licenses
```

## 📋 Recursos do App

### Funcionalidades Principais
- **Gestão de Funcionários**: Cadastro, edição e exclusão
- **Controle de Adiantamentos**: Registro e acompanhamento
- **Relatórios PDF**: Comprovantes individuais e relatórios completos
- **Interface Intuitiva**: Design moderno e responsivo

### Recursos Mobile
- **Armazenamento Local**: Dados salvos no dispositivo
- **Compartilhamento**: PDFs podem ser compartilhados
- **Offline**: Funciona sem conexão com internet
- **Performance**: Otimizado para dispositivos móveis

## 🛠️ Tecnologias Utilizadas

- **React 18** - Interface de usuário
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Capacitor** - Framework híbrido
- **jsPDF** - Geração de PDFs
- **Lucide React** - Ícones

## 📱 Instalação no Android

1. Ative "Fontes desconhecidas" nas configurações do Android
2. Transfira o arquivo APK para o dispositivo
3. Toque no arquivo APK para instalar
4. Abra o app "Adiantamento Salarial"

## 🔒 Segurança

- Dados armazenados localmente no dispositivo
- Não há transmissão de dados para servidores externos
- Backup recomendado através de exportação de relatórios

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique se todos os pré-requisitos estão instalados
2. Consulte a documentação do Capacitor
3. Verifique as configurações do Android Studio

---

**Versão:** 1.0.0  
**Compatibilidade:** Android 5.1+ (API 22+)
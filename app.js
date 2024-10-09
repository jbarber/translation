/* 
 * TODO:
 * Tidy up saving values to localStorage / resetting the form
 * Style the reset buttons differently
 * Make the spinner fit in the buttons so they don't change size
 * Make the error flash modal appear in the top left of the viewport
 * Make the error modal show more informative error messages
 * Allow the user to specify the system prompt interactively
 */

const originalText = document.getElementById('original-text');
const translatedText = document.getElementById('translated-text');
const cleanedUp = document.getElementById('cleanedup-text');
const apiKeyInput = document.getElementById('api-key-input');
const projectIdInput = document.getElementById('gcp-project-input');

window.onload = function() {
    const savedText = localStorage.getItem('originalText');
    const savedApiKey = localStorage.getItem('apiKey');
    const projectId = localStorage.getItem('projectId');
    const translated = localStorage.getItem('translatedText');
    
    if (savedText) {
        originalText.innerHTML = savedText;
    }
    
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }

    if (projectId) {
        projectIdInput.value = projectId;
    }

    if (translated) {
        translatedText.innerHTML = translated;
    }
};

document.getElementById('clear-api-token').addEventListener('click', () => {
  apiKeyInput.value = ''
});

document.getElementById('clear-all-text').addEventListener('click', () => {
  originalText.value = '';
  translatedText.innerHTML = '';
  cleanedUp.innerHTML = '';
});

originalText.addEventListener('input', () => {
    localStorage.setItem('originalText', originalText.innerHTML);
});

apiKeyInput.addEventListener('input', () => {
    localStorage.setItem('apiKey', apiKeyInput.value);
});

translatedText.addEventListener('input', () => {
    localStorage.setItem('translatedText', translatedText.innerHTML);
});

projectIdInput.addEventListener('input', () => {
    localStorage.setItem('projectId', projectIdInput.value);
});

document.getElementById('translate-btn').addEventListener('click', async () => {
  const button = document.getElementById('translate-btn');

  const text = originalText.innerHTML;
  const apiKey = apiKeyInput.value.trim();
  const projectId = projectIdInput.value.trim();

  if (!text) {
    showFlashMessage('Missing text to translate');
    return;
  }

  if (!apiKey) {
    showFlashMessage('Missing API key');
    return;
  }

  button.disabled = true;
  const spinner = button.querySelector('.spinner')
  showSpinner(spinner, true);

  setTimeout(async () => {
    try {
      const translationResult = await translateTextV3(projectId, apiKey, text);
      translatedText.innerHTML = translationResult;
    } catch (error) {
      showFlashMessage(error);
    } finally {
      button.disabled = false;
      showSpinner(spinner, false);
    }
  }, 1000);
});

document.getElementById('cleanup-btn').addEventListener('click', async () => {
  const button = document.getElementById('cleanup-btn');
  const text = document.getElementById('translated-text');

  // https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/system-instruction-introduction
  const system_prompt = `
You are a professional translator translating text from Portuguese to English.

You have been given some text which has been roughly translated from Portuguse to English.

Your task is to rewrite it so it's more idiomatic.

Remove parenthetical commas.

Do not dramatically change the voice of the text - this is a for a professional scientific audience.

Retain all names and do not shorten them.

Use British English spelling and grammar.

Use Oxford commas.

When dealing with dates spell them out, for example "17" should be written as "the 17th".

When dealing with pronouns, check that they match the gender of the subject.

Do not change the paragraphs of the original text.
`  

  const user_prompt = "Copy edit the following text:"

  // Get rid of empty blocks
  const textNodes = Array.from(text.childNodes).filter(p => (!!p.textContent.trim()))

  const parts = [{text: user_prompt}].concat(textNodes.map(p => ({text: p.textContent})))

  const apiKey = apiKeyInput.value.trim();
  const projectId = projectIdInput.value.trim();

  if (!text) {
    showFlashMessage('Missing text to cleanup');
    return;
  }

  if (!apiKey) {
    showFlashMessage('Missing API key');
    return;
  }

  button.disabled = true;
  const spinner = button.querySelector('.spinner')
  showSpinner(spinner, true);

  setTimeout(async () => {
    try {
      const cleanedText = await enhanceWithGemini(projectId, apiKey, system_prompt, parts);
      cleanedUp.innerHTML = cleanedText.split("\n").
        map(text => text.trim()).
        filter(text => (!!text)).
        map(p => p.replace(/\."/g, '".')).
        map(p => `<p>${p}</p>`).
        join('')
    } catch (error) {
      showFlashMessage(error);
    } finally {
      button.disabled = false;
      showSpinner(spinner, false);
    }
  }, 1000);
});

function showSpinner(el, show) {
  if (show) {
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}

async function translateTextV3(project_id, apiKey, text) {
  // https://cloud.google.com/translate/docs/reference/rest/v3/projects/translateText
  // Use v3 of the API because it'll take HTML and it'll return it with the
  // formatting/links etc of the original
  const googleTranslateEndpoint = `https://translation.googleapis.com/v3/projects/${project_id}:translateText`;

  const requestBody = {
    sourceLanguageCode: 'pt',
    targetLanguageCode: 'en',
    contents: [text],
    mimeType: 'text/html'
  };

  const response = await fetch(googleTranslateEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'x-goog-user-project': project_id,
      'content-type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error.message);
  }
  return data.translations[0].translatedText;
}

async function enhanceWithGemini(project_id, apiKey, system_prompt, prompt) {
  // https://cloud.google.com/vertex-ai/docs/reference/rest/v1/projects.locations.publishers.models/generateContent
  const location = 'us-central1'
  const model = 'gemini-1.5-flash-002'
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project_id}/locations/${location}/publishers/google/models/${model}:generateContent`

  const requestBody = {
    // FIXME: role can be "user" or "model" - I'm not sure what the difference is
    contents: { role: "user", parts: prompt },
    systemInstruction: { role: "user", parts: [{text: system_prompt}] }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'x-goog-user-project': project_id,
      'content-type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error.message);
  }
  return data.candidates[0].content.parts[0].text
}

function showFlashMessage(message) {
  const flashMessage = document.getElementById('flash-message');
  flashMessage.textContent = message;
  flashMessage.classList.add('show');

  setTimeout(() => {
    flashMessage.classList.remove('show');
  }, 3000);
}

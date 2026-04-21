const syncFormValues = (source: HTMLElement, clone: HTMLElement) => {
  const sourceInputs = source.querySelectorAll<HTMLInputElement>("input");
  const cloneInputs = clone.querySelectorAll<HTMLInputElement>("input");

  sourceInputs.forEach((input, index) => {
    const cloneInput = cloneInputs[index];
    if (!cloneInput) {
      return;
    }

    cloneInput.value = input.value;
    if (input.checked) {
      cloneInput.setAttribute("checked", "checked");
    } else {
      cloneInput.removeAttribute("checked");
    }
  });

  const sourceTextareas = source.querySelectorAll<HTMLTextAreaElement>("textarea");
  const cloneTextareas = clone.querySelectorAll<HTMLTextAreaElement>("textarea");

  sourceTextareas.forEach((textarea, index) => {
    const cloneTextarea = cloneTextareas[index];
    if (!cloneTextarea) {
      return;
    }

    cloneTextarea.value = textarea.value;
    cloneTextarea.textContent = textarea.value;
  });

  const sourceSelects = source.querySelectorAll<HTMLSelectElement>("select");
  const cloneSelects = clone.querySelectorAll<HTMLSelectElement>("select");

  sourceSelects.forEach((select, index) => {
    const cloneSelect = cloneSelects[index];
    if (!cloneSelect) {
      return;
    }

    cloneSelect.value = select.value;
  });
};

export const getPrintableHtmlById = (elementId: string) => {
  const source = document.getElementById(elementId);
  if (!source) {
    return null;
  }

  const clone = source.cloneNode(true) as HTMLElement;
  syncFormValues(source, clone);
  return clone.outerHTML;
};

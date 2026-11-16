/* ================================================================
   Страница о театре имени Андрея Миронова: скрипт
   Два блока:
   1) плавное появление секций при прокрутке;
   2) форма: проверка полей и отправка в Google Таблицу
      через Google Apps Script.
   ================================================================ */

/* ---------- 1. Появление блоков при прокрутке ---------- */
document.documentElement.classList.add('js');
(function () {
  const items = document.querySelectorAll('.section .container > *, .hero-inner > *');
  items.forEach(function (el) { el.classList.add('reveal'); });

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(function (el) { observer.observe(el); });
})();

/* ---------- 2. Форма отзыва ----------
   Что происходит при отправке:
   1) проверяем поля (имя, тема, сообщение, согласие);
   2) если скрытое поле-ловушка заполнено, это бот: молча «успех»;
   3) отправляем данные POST-запросом на адрес Google Apps Script,
      он дописывает строку в Google Таблицу;
   4) показываем «спасибо» или ошибку.

   >>> ВСТАВЬ СЮДА АДРЕС из Apps Script (после «Развёртывания»),
   >>> он заканчивается на /exec. */
const FORM_ENDPOINT = 'ВСТАВЬ_СЮДА_АДРЕС_APPS_SCRIPT';

const form = document.getElementById('feedback-form');

if (form) {
  const statusEl  = document.getElementById('form-status');
  const submitBtn = document.getElementById('feedback-submit');
  const textEl    = document.getElementById('f-message');
  const counterEl = document.getElementById('message-counter');

  function updateCounter() {
    counterEl.textContent = textEl.value.length + ' / ' + textEl.maxLength;
  }
  textEl.addEventListener('input', updateCounter);
  updateCounter();

  function setError(name, text) {
    const box = form.querySelector('.field-error[data-for="' + name + '"]');
    if (!box) return;
    box.textContent = text || '';
    const field = box.closest('.field');
    if (field) field.classList.toggle('has-error', !!text);
  }

  function validate() {
    const f = form.elements;
    let ok = true;
    ['name', 'contact', 'topic', 'show', 'message', 'consent'].forEach(function (n) { setError(n, ''); });

    if (f.name.value.trim().length < 2) { setError('name', 'Напиши, как тебя зовут.'); ok = false; }
    if (!form.querySelector('input[name="topic"]:checked')) { setError('topic', 'Выбери, о чём ты пишешь.'); ok = false; }
    if (f.message.value.trim().length < 10) { setError('message', 'Напиши хотя бы пару предложений.'); ok = false; }
    if (!f.consent.checked) { setError('consent', 'Нужно твоё согласие.'); ok = false; }
    return ok;
  }

  function showThanks() {
    form.classList.add('is-sent');
    statusEl.classList.remove('is-error');
    statusEl.innerHTML = 'Спасибо, сообщение получено.<span class="thanks-sub">Оно сохранено в таблице учебного проекта.</span>' +
      '<button type="button" class="thanks-again" id="thanks-again">Написать ещё</button>';
    document.getElementById('thanks-again').addEventListener('click', function () {
      form.reset();
      updateCounter();
      form.classList.remove('is-sent');
      statusEl.textContent = '';
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    statusEl.textContent = '';
    statusEl.classList.remove('is-error');

    if (!validate()) {
      const firstBad = form.querySelector('.field-error:not(:empty)');
      if (firstBad) firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Бот заполнил скрытое поле: делаем вид, что всё хорошо, но ничего не отправляем
    if (form.elements.website.value) { showThanks(); return; }

    if (FORM_ENDPOINT.indexOf('https://') !== 0) {
      statusEl.classList.add('is-error');
      statusEl.textContent = 'Форма ещё не подключена к таблице: в script.js не вставлен адрес Apps Script.';
      return;
    }

    const data = new URLSearchParams();
    ['name', 'contact', 'show', 'message', 'website'].forEach(function (n) { data.append(n, form.elements[n].value.trim()); });
    data.append('topic', form.querySelector('input[name="topic"]:checked').value);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляю…';

    // mode:'no-cors': Google отвечает без CORS-заголовков, поэтому ответ мы не читаем.
    // Если сеть работает и запрос ушёл, считаем успехом.
    fetch(FORM_ENDPOINT, { method: 'POST', mode: 'no-cors', body: data })
      .then(function () { showThanks(); })
      .catch(function () {
        statusEl.classList.add('is-error');
        statusEl.textContent = 'Не получилось отправить. Проверь интернет и попробуй ещё раз.';
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить →';
      });
  });
}

// Run in the browser console after opening the local site and switching to 「闖關挑戰」.
(async () => {
  const results = [];
  const check = (name, pass) => results.push({ name, pass: Boolean(pass) });
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  document.querySelector('[data-tab="quiz"]').click();
  await wait(200);

  check('one question is visible', document.querySelectorAll('.quiz-item').length === 1);
  check('four answer buttons are visible', document.querySelectorAll('.quiz-option').length === 4);
  check('next starts disabled', document.querySelector('#nextQuiz').disabled);
  check('responsive progress starts at question 1', document.querySelector('#quizProgress').textContent.includes('第 1 / 10 題'));

  const firstAnswer = Number(document.querySelector('.quiz-item').dataset.answer);
  document.querySelector(`.quiz-option[data-option="${firstAnswer}"]`).click();
  await wait(80);
  check('correct answer locks all choices', [...document.querySelectorAll('.quiz-option')].every((button) => button.disabled));
  check('correct feedback appears immediately', document.querySelector('#quizFeedback').textContent.includes('你答對了'));
  check('correct answer is marked', document.querySelectorAll('.quiz-option.correct-answer .answer-badge').length === 1);
  check('score increments once', document.querySelector('#quizScore').textContent.includes('答對 1 / 10'));
  check('next becomes available', !document.querySelector('#nextQuiz').disabled);

  document.querySelector('#nextQuiz').click();
  await wait(50);
  check('second question replaces first question', document.querySelector('#quizProgress').textContent.includes('第 2 / 10 題') && document.querySelectorAll('.quiz-item').length === 1);

  const secondAnswer = Number(document.querySelector('.quiz-item').dataset.answer);
  const wrongAnswer = (secondAnswer + 1) % 4;
  document.querySelector(`.quiz-option[data-option="${wrongAnswer}"]`).click();
  await wait(80);
  check('wrong feedback appears immediately', document.querySelector('#quizFeedback').textContent.includes('你答錯了'));
  check('wrong choice is marked', document.querySelectorAll('.quiz-option.wrong-answer').length === 1);
  check('correct answer is also revealed', document.querySelectorAll('.quiz-option.correct-answer .answer-badge').length === 1);
  check('wrong answer does not increment score', document.querySelector('#quizScore').textContent.includes('答對 1 / 10'));

  document.querySelector('#resetQuiz').click();
  await wait(50);
  check('reset returns to question 1 and clears score', document.querySelector('#quizProgress').textContent.includes('第 1 / 10 題') && document.querySelector('#quizScore').textContent.includes('答對 0 / 10'));

  const failed = results.filter((result) => !result.pass);
  console.table(results);
  if (failed.length) throw new Error(`${failed.length} quiz checks failed`);
  return `${results.length} quiz checks passed`;
})();

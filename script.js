fetch('articles.json')
  .then(res => res.json())
  .then(data => {
    const app = document.body;
    app.innerHTML = ''; // clear existing
    const list = document.createElement('div');
    data.forEach(item => {
      const d = document.createElement('div');
      d.className = 'article';
      d.innerHTML = `
        <h2><a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></h2>
		<p>${item.dateText || item.datetime || 'No date'}</p><br>
      `;
      list.appendChild(d);
    });
    app.appendChild(list);
  })
  .catch(err => { document.body.textContent = 'Error: ' + err.message; });

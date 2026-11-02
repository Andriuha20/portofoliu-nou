/* Pagina de previzualizare este statică (imagine + CSS).
   Acest modul rămâne ca punct de extensie (ex: comutator fundal),
   fără nicio legătură cu portofoliul. */
const mostra = document.querySelector('.br-mostra');
if (mostra) {
  mostra.setAttribute('role', 'img');
  mostra.setAttribute('aria-label', 'Previzualizare transparență asset pe tablă de șah');
}

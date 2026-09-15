/*
 * Wymusza polski jako pierwszy jezyk przy pierwszej wizycie w tej przegladarce.
 *
 * Keycloak bez wtyczek wybiera jezyk w kolejnosci: ?kc_locale= > cookie
 * KEYCLOAK_LOCALE > Accept-Language przegladarki (jesli pasuje do
 * supportedLocales) > realm.defaultLocale dopiero na koncu - wiec samo
 * ustawienie defaultLocale=pl w realmie NIE wystarcza: przegladarka z
 * Accept-Language "en" i tak dostanie od razu angielski.
 *
 * Doklejanie ?kc_locale=pl do biezacego URL nie dziala niezawodnie na
 * pierwszej wizycie, bo aplikacja zwykle laduje na
 * /protocol/openid-connect/auth, ktory Keycloak sam wewnetrznie przekierowuje
 * do /login-actions/authenticate - a query param kc_locale nie jest
 * przenoszony przez to przekierowanie. Cookie natomiast przetrwa kazde
 * przekierowanie w obrebie tej samej domeny, wiec ustawiamy KEYCLOAK_LOCALE
 * sami i przeladowujemy strone - dalej Keycloak juz sam czyta ta cookie
 * (ma pierwszenstwo nad Accept-Language).
 *
 * KEYCLOAK_LOCALE ustawiane przez sam Keycloak jest HttpOnly (niedostepne z
 * JS), wiec nie da sie po niej poznac, czy uzytkownik juz swiadomie
 * przelaczyl na EN - zamiast tego uzywamy wlasnej flagi w localStorage:
 * wymuszamy polski TYLKO przy pierwszej wizycie w tej przegladarce. Po tym
 * Keycloak sam pamieta wybor (cookie ustawiana juz po jego stronie przy
 * kazdym uzyciu przelacznika PL/EN), a nasz skrypt juz nigdy wiecej nie
 * ingeruje.
 */
(function () {
  try {
    if (localStorage.getItem('smLocaleSeen')) {
      return;
    }
    localStorage.setItem('smLocaleSeen', '1');
  } catch (e) {
    return;
  }

  var params = new URLSearchParams(window.location.search);
  if (params.has('kc_locale') || document.cookie.indexOf('KEYCLOAK_LOCALE=') !== -1) {
    return;
  }

  document.cookie = 'KEYCLOAK_LOCALE=pl; path=/; max-age=31536000; SameSite=Lax';
  window.location.reload();
})();

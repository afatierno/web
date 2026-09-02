const SESSION_VERSION_KEY = "afa.comercio.deployVersion";

async function fetchDeployVersion_(cacheBust) {
  const response = await fetch("js/asset-version.js?b=" + encodeURIComponent(String(cacheBust)), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudo comprobar la versión desplegada");
  }

  const source = await response.text();
  const match = source.match(/APP_VERSION\s*=\s*"([^"]+)"/);

  return match ? match[1] : "";
}

function applyDeployVersion_(version, cacheBust) {
  const stylesheet = document.getElementById("app-stylesheet");
  const versionLabel = document.getElementById("app-version");
  const query = "v=" + encodeURIComponent(version) + "&b=" + encodeURIComponent(String(cacheBust));

  if (stylesheet) {
    stylesheet.href = "css/styles.css?" + query;
  }

  if (versionLabel) {
    versionLabel.textContent = "v" + version;
  }

  document.title = "Validación comercio v" + version;

  return query;
}

function stripReloadParam_() {
  if (!window.location.search.includes("_=")) {
    return;
  }

  const cleanUrl = window.location.pathname + window.location.hash;
  history.replaceState(null, document.title, cleanUrl);
}

function reloadForNewDeploy_(cacheBust) {
  const reloadUrl = new URL(window.location.href);

  reloadUrl.searchParams.set("_", String(cacheBust));
  window.location.replace(reloadUrl.toString());
}

async function bootstrap_() {
  const cacheBust = Date.now();
  const deployVersion = await fetchDeployVersion_(cacheBust);

  if (!deployVersion) {
    throw new Error("Versión de despliegue no válida");
  }

  const storedVersion = sessionStorage.getItem(SESSION_VERSION_KEY);

  if (storedVersion && storedVersion !== deployVersion) {
    sessionStorage.setItem(SESSION_VERSION_KEY, deployVersion);
    reloadForNewDeploy_(cacheBust);
    return;
  }

  sessionStorage.setItem(SESSION_VERSION_KEY, deployVersion);
  stripReloadParam_();

  const moduleQuery = applyDeployVersion_(deployVersion, cacheBust);
  await import("./app.js?" + moduleQuery);
}

bootstrap_().catch(function (error) {
  const statusMessage = document.getElementById("status-message");

  if (statusMessage) {
    statusMessage.textContent =
      error && error.message ? error.message : "No se pudo iniciar la aplicación";
    statusMessage.className = "status-message status-message-error";
  }
});

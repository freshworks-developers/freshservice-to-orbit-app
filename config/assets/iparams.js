/* eslint-disable no-undef*/
var client;

(async function init() {
  client = await app.initialized();
})();

async function getWorkspaces(apiKey) {
  let workspaceSlugs = new Array();
  let baseUrl = "https://app.orbit.love";
  let options = {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  };
  let [error, response] = await to(
    client.request.get(`${baseUrl}/api/v1/workspaces`, options)
  );
  if (error) {
    console.error("Unforeseen problems getting workspace details from Orbit");
    return "Is this API key correct?";
  }
  let { data: workspaces } = response;
  workspaces.forEach(function prepareList(workspace) {
    let { slug } = workspace.attributes;
    workspaceSlugs.push(slug);
  });
  utils.set("workspace_slug", {
    values: workspaceSlugs,
  });
}

function to(promise, improved) {
  return promise
    .then((data) => {
      data = JSON.parse(data.response);
      return [null, data];
    })
    .catch((err) => {
      if (improved) {
        Object.assign(err, improved);
      }
      return [err];
    });
}

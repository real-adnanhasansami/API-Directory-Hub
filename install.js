// No dependencies to install (Node built-ins only). Kept so Pinokio's "Install" convention is satisfied.
module.exports = {
  run: [
    { method: "shell.run", params: { message: "node -v" } }
  ]
}

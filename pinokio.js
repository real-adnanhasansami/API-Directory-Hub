module.exports = {
  version: "3.0",
  title: "API Directory Hub",
  description: "Self-hosted, offline API directory: 11,860 APIs, instant search, admin panel and 100k+ bulk import.",
  icon: "icon.png",
  menu: async (kernel, info) => {
    const running = await kernel.running(__dirname, "start.js")
    if (running) {
      const local = info.local("start.js")
      if (local && local.url) {
        return [
          { default: true, icon: "fa-solid fa-rocket", text: "Open Directory", href: local.url },
          { icon: "fa-solid fa-terminal", text: "Server Log", href: "start.js" },
          { icon: "fa-solid fa-power-off", text: "Stop", href: "stop.js" }
        ]
      }
      return [{ default: true, icon: "fa-solid fa-terminal", text: "Starting… (show log)", href: "start.js" }]
    }
    return [
      { default: true, icon: "fa-solid fa-power-off", text: "Start", href: "start.js" },
      { icon: "fa-solid fa-database", text: "Rebuild Data From Repo Folder", href: "rebuild.js" }
    ]
  }
}

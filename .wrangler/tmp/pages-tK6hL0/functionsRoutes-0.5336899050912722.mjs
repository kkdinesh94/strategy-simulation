import { onRequest as __api___route___ts_onRequest } from "D:\\Dinesh_Academic\\Projects\\GItHub\\strategy-simulation\\functions\\api\\[[route]].ts"

export const routes = [
    {
      routePath: "/api/:route*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___route___ts_onRequest],
    },
  ]
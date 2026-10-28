//src/plugins/permission.js
import permissionHelper from "../utils/permission";

export default {
  install(app) {
    app.use(permissionHelper);
  },
};

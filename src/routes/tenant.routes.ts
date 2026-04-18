import { Router } from "express";
import { tenantAuthRoutes } from "../modules/tenant/auth";
import { branchesRoutes } from "../modules/tenant/branches";
import { usersRoutes } from "../modules/tenant/users";
import { permissionsRoutes } from "../modules/tenant/permissions";
import { rolesRoutes } from "../modules/tenant/roles";
import { userRolesRoutes } from "../modules/tenant/roles";
import { settingsRoutes } from "../modules/tenant/settings";
import { tenantCatalogRoutes } from "../modules/tenant/catalog";

const router = Router();

router.use("/auth", tenantAuthRoutes);
router.use("/branches", branchesRoutes);
router.use("/users", usersRoutes);
router.use("/users/:userId/roles", userRolesRoutes);
router.use("/permissions", permissionsRoutes);
router.use("/roles", rolesRoutes);
router.use("/settings", settingsRoutes);
router.use("/catalog", tenantCatalogRoutes);

export const tenantRoutes = router;

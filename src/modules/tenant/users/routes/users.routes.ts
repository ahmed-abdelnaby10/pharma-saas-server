import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { usersController } from "../controller/users.controller";

const router = Router();

// All user-management routes require a valid tenant JWT
router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(usersController.list));
router.post("/", asyncHandler(usersController.create));
router.get("/:userId", asyncHandler(usersController.get));
router.patch("/:userId", asyncHandler(usersController.update));
router.delete("/:userId", asyncHandler(usersController.deactivate));

export const usersRoutes = router;

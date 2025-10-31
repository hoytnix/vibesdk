CREATE TABLE `discoverable_plugins` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`author` text,
	`description` text,
	`zip_url` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discoverable_plugins_name_version_idx` ON `discoverable_plugins` (`name`,`version`);--> statement-breakpoint
CREATE TABLE `PluginRegistry` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`status` text DEFAULT 'installed' NOT NULL,
	`permissions` text DEFAULT '{}',
	`installed_at` integer DEFAULT CURRENT_TIMESTAMP,
	`activated_at` integer
);
--> statement-breakpoint
CREATE INDEX `plugin_registry_status_idx` ON `PluginRegistry` (`status`);
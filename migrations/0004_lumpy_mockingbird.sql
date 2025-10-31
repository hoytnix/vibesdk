-- Migration number: 0004 	 2024-03-22T15:00:00.000Z
CREATE TABLE `PluginRegistry` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`status` text DEFAULT 'inactive' NOT NULL,
	`permissions` text NOT NULL
);

CREATE TABLE `PluginErrorLog` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`timestamp` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`error_message` text NOT NULL,
	`stack_trace` text,
	FOREIGN KEY (`plugin_id`) REFERENCES `PluginRegistry`(`id`) ON UPDATE no action ON DELETE cascade
);

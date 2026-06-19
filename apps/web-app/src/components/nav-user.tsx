"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout01Icon } from "@hugeicons/core-free-icons";
import { authClient } from "@/lib/auth/client";

export function NavUser() {
	const { data: session } = authClient.useSession();
	const [signingOut, setSigningOut] = useState(false);

	const user = session?.user;
	const displayName = user?.name || user?.email || "Account";
	const initial = displayName.charAt(0).toUpperCase();

	const handleSignOut = async () => {
		setSigningOut(true);
		try {
			await authClient.signOut();
		} finally {
			// Hard redirect so the root loader re-resolves the (now empty) session.
			window.location.href = "/login";
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				nativeButton={false}
				render={<Avatar className="size-8 cursor-pointer" />}
			>
				{user?.image ? <AvatarImage src={user.image} alt={displayName} /> : null}
				<AvatarFallback>{initial}</AvatarFallback>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuGroup>
					<DropdownMenuLabel className="flex items-center gap-3">
						<Avatar className="size-10">
							{user?.image ? (
								<AvatarImage src={user.image} alt={displayName} />
							) : null}
							<AvatarFallback>{initial}</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-col">
							<span className="truncate font-medium text-foreground">
								{displayName}
							</span>
							{user?.email ? (
								<span className="truncate text-muted-foreground text-xs">
									{user.email}
								</span>
							) : null}
						</div>
					</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="w-full cursor-pointer"
						variant="destructive"
						disabled={signingOut}
						onClick={handleSignOut}
					>
						<HugeiconsIcon icon={Logout01Icon} />
						Log out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

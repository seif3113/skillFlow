import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { FullWidthDivider } from "@/components/full-width-divider";
import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon, CompassIcon } from "@hugeicons/core-free-icons";

export function NotFoundPage() {
	return (
		<div className="flex w-full items-center justify-center overflow-hidden">
			<div className="flex h-screen items-center border-x">
				<div>
					<FullWidthDivider />
					<Empty>
						<EmptyHeader>
							<EmptyTitle className="font-black font-mono text-8xl">
								404
							</EmptyTitle>
							<EmptyDescription className="text-nowrap">
								The page you're looking for might have been <br />
								moved or doesn't exist.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<div className="flex gap-2">
								<Button render={<a href="/" />} nativeButton={false}>
									<HugeiconsIcon
										icon={Home01Icon}
										strokeWidth={2}
										data-icon="inline-start"
									/>
									Go Home
								</Button>
								<Button
									variant="outline"
									render={<a href="/explore" />}
									nativeButton={false}
								>
									<HugeiconsIcon
										icon={CompassIcon}
										strokeWidth={2}
										data-icon="inline-start"
									/>
									Explore
								</Button>
							</div>
						</EmptyContent>
					</Empty>
					<FullWidthDivider />
				</div>
			</div>
		</div>
	);
}

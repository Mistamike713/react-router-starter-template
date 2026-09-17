import { useId, useState } from "react";
import { ARTWORK_UPLOAD_CONFIG } from "~/lib/apparel/config";
import { validateArtworkFile } from "~/lib/apparel/compatibility";
import { uploadArtwork } from "~/lib/apparel/uploadArtwork";
import type { ArtworkRef } from "~/lib/apparel/types";
import { FieldError } from "./StepShell";

type ArtworkUploadFieldProps = {
	label: string;
	value: ArtworkRef | null;
	onChange: (ref: ArtworkRef | null) => void;
	kind: "production" | "inspiration";
	side?: "front" | "back";
	errorMessage?: string;
};

export function ArtworkUploadField({ label, value, onChange, kind, side, errorMessage }: ArtworkUploadFieldProps) {
	const inputId = useId();
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);

	const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		const { valid, error } = validateArtworkFile(file);
		if (!valid) {
			setUploadError(error);
			return;
		}

		setUploadError(null);
		setUploading(true);
		try {
			const ref = await uploadArtwork(file, kind, side);
			onChange(ref);
		} catch (err) {
			setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
		} finally {
			setUploading(false);
		}
	};

	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={inputId} className="text-sm font-bold">{label}</label>
			{value ? (
				<div className="flex items-center gap-2.5 text-sm">
					<span>{"✓"} {value.fileName}</span>
					<button type="button" onClick={() => onChange(null)} className="text-[#A85B2E] underline">
						Remove
					</button>
				</div>
			) : (
				<>
					<input
						id={inputId}
						type="file"
						accept={ARTWORK_UPLOAD_CONFIG.acceptedMimeTypes.join(",")}
						onChange={handleFileChange}
						disabled={uploading}
						className="text-sm"
					/>
					<p className="text-[0.8rem] text-[#7A5C46]">
						{uploading ? "Uploading…" : "PNG, JPG, SVG, or PDF. Max 25MB."}
					</p>
				</>
			)}
			{uploadError && <FieldError message={uploadError} />}
			<FieldError message={errorMessage} />
		</div>
	);
}

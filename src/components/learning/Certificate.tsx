import { useRef, useState } from "react";
import { Download, Share2, Award, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface CertificateProps {
  courseName: string;
  studentName: string;
  completionDate: string;
  instructorName: string;
  certificateId: string;
  verificationUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Certificate = ({
  courseName,
  studentName,
  completionDate,
  instructorName,
  certificateId,
  verificationUrl,
  isOpen,
  onClose,
}: CertificateProps) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!certificateRef.current) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `certificate-${courseName.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Certificate downloaded!");
    } catch (error) {
      toast.error("Failed to download certificate");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: null,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to create image");
          return;
        }

        if (navigator.share && navigator.canShare) {
          const file = new File([blob], "certificate.png", {
            type: "image/png",
          });
          const shareData = {
            title: `Certificate of Completion - ${courseName}`,
            text: `I just completed ${courseName} on CDS Crash Course! Verify: ${verificationUrl}`,
            files: [file],
          };

          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            toast.success("Shared successfully!");
          } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            toast.success("Certificate copied to clipboard!");
          }
        } else {
          // Fallback for browsers without share API
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          toast.success("Certificate copied to clipboard!");
        }
      });
    } catch (error) {
      toast.error("Failed to share certificate");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Course Completion Certificate
          </DialogTitle>
        </DialogHeader>

        {/* Certificate Preview */}
        <div className="flex justify-center py-4">
          <div
            ref={certificateRef}
            className="w-[800px] h-[566px] relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#3ECFB2_1px,transparent_1px),linear-gradient(to_bottom,#3ECFB2_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            {/* Corner Decorations */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-primary/30 to-transparent" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/30 to-transparent" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent/30 to-transparent" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-primary/30 to-transparent" />

            {/* Border */}
            <div className="absolute inset-4 border-2 border-primary/30 rounded-lg" />
            <div className="absolute inset-6 border border-primary/20 rounded-lg" />

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-center text-center px-16 py-12">
              {/* Logo */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="text-2xl font-bold text-white">
                  CDS Crash Course
                </span>
              </div>

              {/* Title */}
              <h2 className="text-lg uppercase tracking-[0.3em] text-primary/80 mb-2">
                Certificate of Completion
              </h2>

              <div className="w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mb-8" />

              {/* Presented To */}
              <p className="text-sm text-slate-400 mb-2">
                This is to certify that
              </p>
              <h1
                className="text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {studentName}
              </h1>

              <p className="text-sm text-slate-400 mb-2">
                has successfully completed the course
              </p>
              <h3 className="text-2xl font-semibold text-primary mb-8">
                {courseName}
              </h3>

              {/* Date & Signature */}
              <div className="flex items-end justify-between w-full max-w-lg mt-auto">
                <div className="text-left">
                  <div className="w-32 border-b border-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="text-sm text-slate-300">{completionDate}</p>
                </div>

                <div className="flex flex-col items-center">
                  <Award className="h-12 w-12 text-primary mb-2" />
                  <p className="text-xs text-slate-500">Verified</p>
                </div>

                <div className="text-right">
                  <div className="w-32 border-b border-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">Instructor</p>
                  <p className="text-sm text-slate-300">{instructorName}</p>
                </div>
              </div>

              {/* Certificate ID */}
              <p className="absolute bottom-6 text-xs text-slate-600">
                Certificate ID: {certificateId} | Verify: {verificationUrl}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-4 border-t border-border">
          <Button onClick={handleDownload} disabled={isDownloading}>
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? "Downloading..." : "Download Certificate"}
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(verificationUrl);
              toast.success("Verification link copied");
            }}
          >
            Copy Verification Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight, Building2, CalendarDays, Loader2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/integrations/django/api";
import { toast } from "sonner";

export const CTA = () => {
  const [demoOpen, setDemoOpen] = useState(false);
  const [submittingDemo, setSubmittingDemo] = useState(false);
  const [demoForm, setDemoForm] = useState({
    name: "",
    email: "",
    company: "",
    preferredAt: "",
    notes: "",
  });

  const handleDemoSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmittingDemo(true);

    const { error } = await api.from("demo_requests").insert({
      name: demoForm.name.trim(),
      email: demoForm.email.trim(),
      company: demoForm.company.trim(),
      preferred_at: demoForm.preferredAt,
      notes: demoForm.notes.trim(),
    });

    setSubmittingDemo(false);
    if (error) {
      toast.error(error.message || "Could not schedule the demo");
      return;
    }

    toast.success("Demo request submitted! We'll contact you soon.");
    setDemoOpen(false);
    setDemoForm({
      name: "",
      email: "",
      company: "",
      preferredAt: "",
      notes: "",
    });
  };

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,hsl(174_72%_56%/0.12),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_20%_80%,hsl(32_95%_55%/0.08),transparent_50%)]" />
      
      <div className="container relative z-10 mx-auto px-4">
        <div className="glass-card p-8 md:p-12 lg:p-16 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/5 mb-8">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">Free to get started</span>
          </div>
          
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Ready to accelerate your{" "}
            <span className="text-gradient-primary">developer journey</span>?
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Join learners who are building skills faster and making steady
            progress with CDS Crash Course.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" asChild>
              <Link to="/auth?mode=signup">
                Create Free Account
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
              <DialogTrigger asChild>
                <Button variant="heroOutline" size="xl">
                  <CalendarDays className="h-5 w-5" />
                  Schedule a Demo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <DialogTitle className="font-display text-2xl">
                    Schedule your demo
                  </DialogTitle>
                  <DialogDescription>
                    Tell us when you are available and what you would like to
                    explore. We’ll follow up using your email.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="demo-name">Name</Label>
                      <Input
                        id="demo-name"
                        required
                        value={demoForm.name}
                        onChange={(event) =>
                          setDemoForm({ ...demoForm, name: event.target.value })
                        }
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-email">Email</Label>
                      <Input
                        id="demo-email"
                        type="email"
                        required
                        value={demoForm.email}
                        onChange={(event) =>
                          setDemoForm({ ...demoForm, email: event.target.value })
                        }
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demo-company">Company or school (optional)</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="demo-company"
                        className="pl-9"
                        value={demoForm.company}
                        onChange={(event) =>
                          setDemoForm({ ...demoForm, company: event.target.value })
                        }
                        placeholder="Organization name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demo-date">Preferred date</Label>
                    <Input
                      id="demo-date"
                      type="date"
                      required
                      value={demoForm.preferredAt}
                      onChange={(event) =>
                        setDemoForm({
                          ...demoForm,
                          preferredAt: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demo-notes">What would you like to see?</Label>
                    <Textarea
                      id="demo-notes"
                      value={demoForm.notes}
                      onChange={(event) =>
                        setDemoForm({ ...demoForm, notes: event.target.value })
                      }
                      placeholder="Tell us about your goals or questions..."
                      rows={3}
                      maxLength={1000}
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDemoOpen(false)}
                      disabled={submittingDemo}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submittingDemo}>
                      {submittingDemo && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Request Demo
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <p className="text-sm text-muted-foreground mt-6">
            No credit card required • Free tier includes 100 questions/month
          </p>
        </div>
      </div>
    </section>
  );
};

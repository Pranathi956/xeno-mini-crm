import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, KeyRound, Loader2, Users } from "lucide-react";
import { useCreateCampaign, useSendCampaign, usePreviewSegment } from "@workspace/api-client-react";
import type { AiChatMessage, AiReply } from "@workspace/api-client-react";

export default function AiCampaigns() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState(localStorage.getItem("groq_api_key") || "");
  const [messages, setMessages] = useState<AiChatMessage[]>([
    { role: "assistant", content: "Hi! I'm your campaign assistant. What kind of campaign would you like to run today? You can say something like 'Send a 20% discount SMS to customers in Mumbai who haven't visited in 30 days.'" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Preview State
  const [previewSegmentQuery, setPreviewSegmentQuery] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewChannel, setPreviewChannel] = useState("sms");
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const previewMutation = usePreviewSegment();
  const createMutation = useCreateCampaign();
  const sendMutation = useSendCampaign();

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
    localStorage.setItem("groq_api_key", key);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !apiKey) {
      if (!apiKey) toast({ title: "API Key Required", description: "Please enter your Groq API key.", variant: "destructive" });
      return;
    }

    const userMsg: AiChatMessage = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages
        })
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data: AiReply = await response.json();

      setMessages([...newMessages, { role: "assistant", content: data.reply }]);

      if (data.action === "create_campaign" && data.segmentQuery) {
        setPreviewSegmentQuery(data.segmentQuery);
        setPreviewMessage(data.messageDraft || "");
        setPreviewChannel(data.channel || "sms");

        // Fetch segment count
        previewMutation.mutate(
          { data: { segmentQuery: data.segmentQuery } },
          {
            onSuccess: (res) => {
              setPreviewCount(res.count);
            }
          }
        );
      }

    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsTyping(false);
    }
  };

  const handleLaunch = () => {
    if (!previewSegmentQuery || !previewMessage) return;

    createMutation.mutate(
      {
        data: {
          name: `AI Campaign - ${new Date().toLocaleDateString()}`,
          segmentQuery: previewSegmentQuery,
          message: previewMessage,
          channel: previewChannel,
          sentByAi: true
        }
      },
      {
        onSuccess: (campaign) => {
          sendMutation.mutate(
            { id: campaign.id },
            {
              onSuccess: () => {
                toast({ title: "Success!", description: "Campaign launched successfully 🚀" });
                setPreviewSegmentQuery("");
                setPreviewMessage("");
                setPreviewCount(null);
                setMessages([...messages, { role: "assistant", content: "Your campaign has been created and sent successfully!" }]);
              },
              onError: (err) => {
                toast({ title: "Launch Failed", description: "Failed to send the campaign.", variant: "destructive" });
              }
            }
          );
        },
        onError: (err) => {
          toast({ title: "Creation Failed", description: "Failed to create the campaign.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      {/* Left Panel: Chat */}
      <Card className="flex-1 flex flex-col border-border/50 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-secondary/30 flex items-center gap-3">
          <KeyRound className="w-4 h-4 text-muted-foreground" />
          <Input 
            type="password" 
            placeholder="sk-groq-..." 
            value={apiKey} 
            onChange={handleApiKeyChange}
            className="h-8 max-w-[240px] bg-background border-border/50 focus-visible:ring-primary/50"
          />
          <span className="text-xs text-muted-foreground ml-2">Groq API Key (Local Storage)</span>
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="flex flex-col gap-4 pb-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-primary/20 text-primary" : "bg-secondary text-foreground"}`}>
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`px-4 py-3 rounded-lg max-w-[80%] text-sm ${
                  m.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-secondary/50 text-foreground border border-border/50 rounded-tl-none leading-relaxed"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-4 py-3 rounded-lg bg-secondary/50 border border-border/50 rounded-tl-none flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border/50 bg-secondary/10">
          <div className="flex gap-2">
            <Input 
              placeholder="Describe your campaign..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="bg-background border-border/50"
              disabled={isTyping}
            />
            <Button onClick={handleSend} disabled={isTyping || !input.trim()} className="shrink-0 px-8">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Right Panel: Preview */}
      <Card className="w-full md:w-[400px] shrink-0 border-border/50 bg-card flex flex-col">
        <div className="p-4 border-b border-border/50 bg-secondary/30">
          <h2 className="font-semibold tracking-tight">Campaign Preview</h2>
        </div>
        
        {previewSegmentQuery ? (
          <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Audience Segment</label>
              <div className="p-3 bg-secondary/30 rounded border border-border/50 font-mono text-xs text-primary/90 break-words">
                {previewSegmentQuery}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {previewCount !== null ? (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <Users className="w-3 h-3 mr-1" /> {previewCount} Customers Matched
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Calculating...
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Channel</label>
              <div>
                <Badge className="uppercase tracking-widest">{previewChannel}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Message Draft</label>
              <div className="p-4 bg-secondary/30 rounded border border-border/50 text-sm whitespace-pre-wrap">
                {previewMessage}
              </div>
            </div>

            <div className="mt-auto pt-6">
              <Button 
                className="w-full h-12 text-base font-semibold shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-shadow" 
                onClick={handleLaunch}
                disabled={createMutation.isPending || sendMutation.isPending || previewCount === 0}
              >
                {createMutation.isPending || sendMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Launching...</>
                ) : (
                  "Launch Campaign 🚀"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
            Describe a campaign to the AI assistant to generate a preview.
          </div>
        )}
      </Card>
    </div>
  );
}

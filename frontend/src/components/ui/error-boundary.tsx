"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, ChevronDown, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dashboard caught rendering error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });
  };

  private handleCopyError = () => {
    const errorString = `${this.state.error?.name || "Error"}: ${this.state.error?.message || ""}\n${this.state.error?.stack || ""}\n${this.state.errorInfo?.componentStack || ""}`;
    navigator.clipboard.writeText(errorString);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || "Something went wrong in this section";
      const message =
        this.props.fallbackMessage ||
        "An unexpected error occurred while rendering this page component. Your session and unsaved changes in other tabs remain safe.";

      return (
        <div className="min-h-[500px] flex items-center justify-center p-6 w-full">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                Graceful Recovery Active
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {message}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={this.handleReset}
                className="w-full sm:w-auto gap-2 rounded-xl shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full sm:w-auto gap-2 rounded-xl"
              >
                Reload Section
              </Button>
            </div>

            {/* Technical diagnostic details toggle */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-left">
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 mx-auto cursor-pointer"
              >
                <span>{this.state.showDetails ? "Hide Error Diagnostics" : "View Technical Diagnostics"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${this.state.showDetails ? "rotate-180" : ""}`} />
              </button>

              {this.state.showDetails && (
                <div className="mt-3 relative rounded-xl bg-slate-950 text-slate-200 p-3.5 font-mono text-[11px] overflow-x-auto max-h-48">
                  <button
                    type="button"
                    onClick={this.handleCopyError}
                    className="absolute top-2.5 right-2.5 p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Copy Error Stack"
                  >
                    {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <p className="text-rose-400 font-semibold mb-1">
                    {this.state.error?.name}: {this.state.error?.message}
                  </p>
                  <pre className="whitespace-pre-wrap text-slate-400 text-[10px] leading-relaxed">
                    {this.state.error?.stack || this.state.errorInfo?.componentStack || "No stack trace available."}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


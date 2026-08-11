"use client";

import { useState } from "react";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ReportForm } from "@/components/reports/report-form";
import { PreviousReports } from "@/components/reports/previous-reports";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ReportPage() {
  const [activeTab, setActiveTab] = useState("new");

  return (
    <div>
      <PageHeader title="Report a Problem" />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="new">New Report</TabsTrigger>
          <TabsTrigger value="previous">Previous Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="mt-0">
          <Suspense fallback={null}>
            <ReportForm />
          </Suspense>
        </TabsContent>
        <TabsContent value="previous" className="mt-0">
          <Suspense fallback={null}>
            <PreviousReports />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

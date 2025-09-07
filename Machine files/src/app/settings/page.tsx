'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Bell, CreditCard, User, Shield, TrendingDown } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  const { user, loading, isAuthenticated, logout } = useAuth()
  const [notifications, setNotifications] = useState({
    email: false,
    webhook: false,
    webhookUrl: ''
  })

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      redirect('/auth/login')
    }
  }, [loading, isAuthenticated])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center">
                <TrendingDown className="h-8 w-8 text-primary mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Followlytics Settings</h1>
                  <p className="text-sm text-gray-600">Manage your account and preferences</p>
                </div>
              </Link>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Account Information
              </CardTitle>
              <CardDescription>Your X account details and subscription status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>X Handle</Label>
                  <Input value={`@${user.displayName || 'username'}`} disabled />
                </div>
                <div>
                  <Label>Subscription Plan</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Free Plan</Badge>
                    <Link href="/pricing">
                      <Button size="sm" variant="outline">Upgrade</Button>
                    </Link>
                  </div>
                </div>
              </div>
              <div>
                <Label>Account Created</Label>
                <Input value="January 15, 2024" disabled />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure how you want to be notified about unfollows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-500">Get notified via email when someone unfollows you</p>
                </div>
                <Switch 
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Webhook Notifications</Label>
                  <p className="text-sm text-gray-500">Send unfollow data to your webhook URL</p>
                  <Badge variant="outline" className="text-xs">Professional Plan</Badge>
                </div>
                <Switch 
                  checked={notifications.webhook}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, webhook: checked }))}
                  disabled
                />
              </div>

              {notifications.webhook && (
                <div>
                  <Label>Webhook URL</Label>
                  <Input 
                    placeholder="https://your-app.com/webhook"
                    value={notifications.webhookUrl}
                    onChange={(e) => setNotifications(prev => ({ ...prev, webhookUrl: e.target.value }))}
                    disabled
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Subscription Management
              </CardTitle>
              <CardDescription>Manage your billing and subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Current Plan: Free</h4>
                  <p className="text-sm text-gray-500">1 account, 7 days history, basic tracking</p>
                </div>
                <Link href="/pricing">
                  <Button>Upgrade Plan</Button>
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">23</div>
                  <p className="text-sm text-gray-500">Total Unfollows Tracked</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">7</div>
                  <p className="text-sm text-gray-500">Days of History</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">1</div>
                  <p className="text-sm text-gray-500">Connected Account</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Privacy & Security
              </CardTitle>
              <CardDescription>Control your data and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data Retention</Label>
                    <p className="text-sm text-gray-500">How long we keep your unfollow data</p>
                  </div>
                  <Badge variant="outline">7 days (Free Plan)</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>API Access</Label>
                    <p className="text-sm text-gray-500">Programmatic access to your data</p>
                  </div>
                  <Badge variant="outline">Agency Plan Required</Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-red-600">Delete Account</Label>
                    <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Settings */}
          <div className="flex items-center justify-between">
            <Button onClick={logout} variant="outline">
              Sign Out
            </Button>
            <Button>
              Save Settings
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

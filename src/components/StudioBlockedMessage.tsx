'use client'

import React from 'react'
import { AlertCircle, Clock, Phone, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface StudioBlockedMessageProps {
  studioName?: string
  blockReason?: string
  gracePeriodEnds?: Date | null
  contactEmail?: string
  contactPhone?: string
}

export default function StudioBlockedMessage({
  studioName = 'seu studio',
  blockReason,
  gracePeriodEnds,
  contactEmail = 'contato@experttraining.com.br',
  contactPhone = '(11) 99999-9999'
}: StudioBlockedMessageProps) {
  const isGracePeriod = gracePeriodEnds && new Date(gracePeriodEnds) > new Date()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${isGracePeriod ? 'bg-yellow-100' : 'bg-red-100'}`}>
              {isGracePeriod ? (
                <Clock className={`h-6 w-6 ${isGracePeriod ? 'text-yellow-600' : 'text-red-600'}`} />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-2xl">
                {isGracePeriod ? 'Período de Carência' : 'Acesso Bloqueado'}
              </CardTitle>
              <CardDescription>
                {studioName}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isGracePeriod ? (
            <Alert className="border-yellow-200 bg-yellow-50">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Atenção: Pagamento Pendente</AlertTitle>
              <AlertDescription className="text-yellow-700">
                O acesso ao sistema será bloqueado em{' '}
                <strong>
                  {gracePeriodEnds ? new Date(gracePeriodEnds).toLocaleDateString('pt-BR') : 'breve'}
                </strong>.
                Entre em contato com o administrador para regularizar a situação.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Acesso Suspenso</AlertTitle>
              <AlertDescription>
                {blockReason || 'O acesso ao sistema foi temporariamente suspenso. Entre em contato com o administrador para mais informações.'}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Como resolver?</h3>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Entre em contato com o administrador do studio para regularizar a situação:
              </p>

              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <a 
                      href={`mailto:${contactEmail}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {contactEmail}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Telefone</p>
                    <a 
                      href={`tel:${contactPhone}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {contactPhone}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {!isGracePeriod && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Após a regularização, você poderá acessar o sistema normalmente.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

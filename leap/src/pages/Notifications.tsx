import { Link } from 'react-router-dom'
import { Button, Card, Empty, ErrorBox, Loading, PageHeader } from '../components/ui'
import { useAction, useApi } from '../hooks'
import { listNotifications, markRead } from '../services/api'
import { Bell, CheckCheck } from 'lucide-react'

export default function Notifications() {
  const q = useApi('notifications', listNotifications)
  const read = useAction((id?: string) => markRead(id), 'Marked as read')

  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />

  const notifications = q.data!
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All caught up.'}
        action={
          unread > 0 ? (
            <Button size="sm" variant="ghost" onClick={() => read.mutate(undefined)}>
              <CheckCheck size={14} /> Mark all read
            </Button>
          ) : undefined
        }
      />

      <Card>
        {notifications.length === 0 ? (
          <Empty
            title="No notifications yet"
            hint="Updates about your placement, logbooks, visits and results appear here."
          />
        ) : (
          <ul className="divide-y divide-line">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-3 py-3.5 ${!n.read ? 'bg-blue-50/40' : ''}`}
              >
                <div
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.read ? 'bg-line' : 'bg-brand'
                  }`}
                  aria-label={n.read ? 'Read' : 'Unread'}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!n.read ? 'font-medium text-ink' : 'text-ink'}`}>
                    {n.text}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                    <span>
                      {new Date(n.at).toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {n.link && (
                      <Link
                        className="font-medium text-brand hover:underline"
                        to={n.link}
                        onClick={() => read.mutate(n.id)}
                      >
                        Open →
                      </Link>
                    )}
                  </div>
                </div>
                {!n.read && (
                  <button
                    className="shrink-0 text-xs font-medium text-brand hover:underline"
                    onClick={() => read.mutate(n.id)}
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

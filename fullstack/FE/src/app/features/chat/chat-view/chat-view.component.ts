import { Component, OnInit, OnDestroy, signal, effect, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { WebSocketService } from '@core/services/websocket.service';
import { MessagesService } from '@core/services/messages.service';
import { SessionsService } from '@core/services/sessions.service';
import { LiveIdeMessage, LiveIdeRole } from '@core/types';
import { ButtonComponent } from '@shared/components/button/button.component';
import { HeaderComponent } from '@shared/components/header/header.component';

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, HeaderComponent],
  templateUrl: './chat-view.component.html',
  styleUrl: './chat-view.component.scss'
})
export class ChatViewComponent implements OnInit, OnDestroy {
  sessionId = signal<string | null>(null);
  messages = signal<LiveIdeMessage[]>([]);
  newMessage = signal('');
  isConnected!: Signal<boolean>;
  private subscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wsService: WebSocketService,
    private messagesService: MessagesService,
    private sessionsService: SessionsService
  ) {
    // Initialize isConnected from wsService
    this.isConnected = this.wsService.isConnected;
    // Update messages when WebSocket receives new ones
    effect(() => {
      const sessionId = this.sessionId();
      if (sessionId) {
        this.subscription = this.wsService.messages$.subscribe(msg => {
          if (msg.sessionId === sessionId) {
            this.messagesService.addMessage(sessionId, msg);
            this.messages.set(this.messagesService.getMessagesForSession(sessionId));
          }
        });
      }
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/sessions']);
      return;
    }

    this.sessionId.set(id);
    this.loadMessages();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
    this.subscription?.unsubscribe();
  }

  private loadMessages(): void {
    const id = this.sessionId();
    if (!id) return;

    this.messagesService.loadMessages(id).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
      }
    });
  }

  private connectWebSocket(): void {
    const id = this.sessionId();
    if (id) {
      this.wsService.connect(id);
    }
  }

  sendMessage(): void {
    const content = this.newMessage().trim();
    const id = this.sessionId();
    
    if (!content || !id) return;

    const message: Omit<LiveIdeMessage, 'ts'> = {
      type: 'agent_message',
      sessionId: id,
      from: 'client',
      content
    };

    this.wsService.sendMessage(message);
    this.newMessage.set('');
  }

  isFromIde(role: LiveIdeRole): boolean {
    return role === 'ide';
  }

  formatTime(ts: string): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}


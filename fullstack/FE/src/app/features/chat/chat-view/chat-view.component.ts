import { Component, OnInit, OnDestroy, signal, effect, Signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, HeaderComponent, DatePipe],
  templateUrl: './chat-view.component.html',
  styleUrl: './chat-view.component.scss'
})
export class ChatViewComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef<HTMLDivElement>;
  
  sessionId = signal<string | null>(null);
  messages = signal<LiveIdeMessage[]>([]);
  newMessage = signal('');
  isConnected!: Signal<boolean>;
  activeTabs = signal<Array<{ tabId: string; connectedAt: Date }>>([]);
  selectedTabId = signal<string | null>(null);
  private subscription?: Subscription;
  private tabsSubscription?: Subscription;
  private shouldScroll = false;
  private previousMessageCount = 0;

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
            // Add message to service (it will filter what to store)
            this.messagesService.addMessage(sessionId, msg);
            this.messages.set(this.messagesService.getMessagesForSession(sessionId));
            
            // Only auto-scroll for agent_message types, not status messages
            if (msg.type === 'agent_message') {
              this.shouldScroll = true;
            }
          }
        });
      }
    });
    
    // Auto-scroll when messages change
    effect(() => {
      const currentMessages = this.messages();
      if (currentMessages.length !== this.previousMessageCount) {
        this.previousMessageCount = currentMessages.length;
        this.shouldScroll = true;
      }
    });
  }
  
  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.messagesContainer) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }
  
  private scrollToBottom(): void {
    if (this.messagesContainer?.nativeElement) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
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
    this.loadActiveTabs();
    
    // Poll for active tabs every 5 seconds
    setInterval(() => {
      this.loadActiveTabs();
    }, 5000);
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
    this.subscription?.unsubscribe();
    this.tabsSubscription?.unsubscribe();
  }
  
  private loadActiveTabs(): void {
    const id = this.sessionId();
    if (!id) return;
    
    console.log('🔄 Loading active tabs for session:', id);
    this.tabsSubscription = this.sessionsService.getActiveTabs(id).subscribe({
      next: (tabs) => {
        console.log('📋 Active tabs received:', tabs);
        this.activeTabs.set(tabs);
        // Auto-select first tab if none selected and tabs available
        if (!this.selectedTabId() && tabs.length > 0) {
          this.selectedTabId.set(tabs[0].tabId);
          console.log('✅ Auto-selected tab:', tabs[0].tabId);
        }
      },
      error: (error) => {
        console.error('❌ Failed to load active tabs:', error);
        // Set empty array on error to prevent UI issues
        this.activeTabs.set([]);
      }
    });
  }
  
  selectTab(tabId: string): void {
    this.selectedTabId.set(tabId);
  }

  private loadMessages(): void {
    const id = this.sessionId();
    if (!id) return;

    this.messagesService.loadMessages(id).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.previousMessageCount = msgs.length;
        // Scroll to bottom after loading initial messages
        setTimeout(() => {
          this.shouldScroll = true;
        }, 100);
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

    // Create message with timestamp
    const message: LiveIdeMessage = {
      type: 'agent_message',
      sessionId: id,
      from: 'client',
      content,
      ts: new Date().toISOString()
    };

    // Add message to local state immediately (optimistic update)
    this.messagesService.addMessage(id, message);
    this.messages.set(this.messagesService.getMessagesForSession(id));
    this.shouldScroll = true; // Trigger scroll after sending

    // Send via WebSocket with targetTabId if selected
    const targetTabId = this.selectedTabId();
    this.wsService.sendMessage(message, targetTabId || undefined);
    this.newMessage.set('');
  }

  isFromIde(role: LiveIdeRole): boolean {
    return role === 'ide';
  }

  formatTime(ts: string): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}


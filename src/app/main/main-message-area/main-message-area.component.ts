import {
  Component,
  ViewChild,
  AfterViewInit,
  ElementRef,
  OnInit,
  inject,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MessageAreaHeaderComponent } from './message-area-header/message-area-header.component';
import { MessageAreaChatHistoryComponent } from './message-area-chat-history/message-area-chat-history.component';
import { MessageAreaNewMessageComponent } from './message-area-new-message/message-area-new-message.component';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { NgClass } from '@angular/common';
import { Renderer2 } from '@angular/core';
import { ChannelService } from '../../shared/services/channel-service/channel.service';
import { ActivatedRoute } from '@angular/router';
import { ThreadComponent } from './thread/thread.component';
import { UserService } from '../../shared/services/user-service/user.service';
import { BehaviorService } from '../../shared/services/behavior-service/behavior.service';
import { Subscription } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';

@Component({
  selector: 'app-main-message-area',
  standalone: true,
  imports: [
    MatCardModule,
    NgClass,
    MessageAreaHeaderComponent,
    MessageAreaChatHistoryComponent,
    MessageAreaNewMessageComponent,
    MatSidenavModule,
    ThreadComponent,
  ],
  templateUrl: './main-message-area.component.html',
  styleUrls: ['./main-message-area.component.scss'],
})
export class MainMessageAreaComponent implements AfterViewInit, OnInit {
  events: string[] = [];
  opened: boolean = false;
  threadOpened: boolean = false;
  channelData: any;
  channelId!: string | null;
  public currentUserId!: string;
  behaviorService = inject(BehaviorService);
  sideNavOpened = true;
  subscription!: Subscription;
  breakpointObserver = inject(BreakpointObserver);
  drawerMode: 'side' | 'over' = 'side';

  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild('sidenav', { read: ElementRef }) sidenavElement!: ElementRef;

  constructor(
    private renderer: Renderer2,
    private channelService: ChannelService,
    private route: ActivatedRoute,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.userService.userId;

    // Channel-Daten abonnieren
    this.channelService.channelData$.subscribe((data) => {
      this.channelData = data; // Channel-Daten speichern
    });

    // Überprüfen, ob sich die URL oder die channelId geändert hat
    this.route.paramMap.subscribe((params) => {
      const newChannelId = params.get('channelId');
      if (newChannelId !== this.channelId) {
        this.channelId = newChannelId; // Setze die neue Channel ID
        this.channelService.setChannel(this.channelId || ''); // Channel setzen
        this.closeSidenav();
      }
    });

    this.subscription = this.behaviorService.sideNavOpened$.subscribe(
      (value) => {
        this.sideNavOpened = value;
      }
    );

    this.breakpointObserver
      .observe(['(min-width: 992px)'])
      .subscribe((result) => {
        this.drawerMode = result.matches ? 'side' : 'over';
      });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  ngAfterViewInit() {
    // Füge box-shadow hinzu, wenn das Sidenav komplett geöffnet ist
    this.sidenav.openedStart.subscribe(() => {
      this.renderer.setStyle(
        this.sidenavElement.nativeElement,
        'box-shadow',
        '0px 2px 2px 0px rgba(0, 0, 0, 0.078)'
      );
    });

    this.sidenav.closedStart.subscribe(() => {
      this.renderer.removeStyle(
        this.sidenavElement.nativeElement,
        'box-shadow'
      );
    });
  }

  openSidenav() {
    if (this.sidenav) {
      this.sidenavElement.nativeElement.classList.remove('d-none');
      this.sidenav.open();
      this.threadOpened = true;
    }
  }

  closeSidenav() {
    if (this.sidenav) {
      this.sidenav.close();
      this.threadOpened = false;
      setTimeout(
        () => this.sidenavElement.nativeElement.classList.add('d-none'),
        300
      );
    }
  }
}

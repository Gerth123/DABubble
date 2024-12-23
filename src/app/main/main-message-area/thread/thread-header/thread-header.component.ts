import { Component, inject, OnInit } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MainMessageAreaComponent } from '../../main-message-area.component';
import { ChannelService } from '../../../../shared/services/channel-service/channel.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-thread-header',
  standalone: true,
  imports: [MatIcon, MatIcon],
  templateUrl: './thread-header.component.html',
  styleUrl: './thread-header.component.scss',
})
export class ThreadHeaderComponent implements OnInit {
  public channelService = inject(ChannelService);
  public channelName: string = '';
  private channelSubscription: Subscription = new Subscription();

  constructor(public mainMessageArea: MainMessageAreaComponent) {}

  /**
   * Initialize the component and load the current channel name.
   */
  ngOnInit(): void {
    this.getCurrentChannelName();
  }

  /**
   * Get the name of the current channel.
   */
  getCurrentChannelName(): void {
    this.channelSubscription = this.channelService.channelData$.subscribe(
      (channel) => {
        if (channel) this.channelName = channel.channelName;
        else this.channelName = 'Channel nicht gefunden';
      }
    );
  }

  /** 
   * Clean up subscriptions on component destroy.
   */
  ngOnDestroy(): void {
    this.channelSubscription.unsubscribe();
  }
}

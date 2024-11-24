import { NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [NgSwitch, NgSwitchCase, NgSwitchDefault],
  templateUrl: './file-preview.component.html',
  styleUrl: './file-preview.component.scss',
})
export class FilePreviewComponent {
  @Input() attachmentUrl!: string;
  @Output() click = new EventEmitter<Event>();

  constructor(public sanitizer: DomSanitizer) {}

  get fileType(): string {
    const url = this.attachmentUrl;
    const filename = decodeURIComponent(
      url.split('/').pop()?.split('?')[0] || ''
    );
    const extension = filename.split('.').pop()?.toLowerCase();

    if (!extension) return 'unknown';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension))
      return 'image';
    if (['doc', 'docx'].includes(extension)) return 'doc';
    if (['txt', 'csv'].includes(extension)) return 'text';
    if (['xlsx', 'xls'].includes(extension)) return 'excel';
    return 'unknown';
  }

  onClick(event: Event): void {
    this.click.emit(event);
  }

  public getFileType(url: string): string {
    const filename = decodeURIComponent(
      url.split('/').pop()?.split('?')[0] || ''
    );
    const extension = filename.split('.').pop()?.toLowerCase();

    if (!extension) return 'unknown';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension))
      return 'image';
    if (['doc', 'docx'].includes(extension)) return 'doc';
    if (['txt', 'csv'].includes(extension)) return 'text';
    if (['xlsx', 'xls'].includes(extension)) return 'excel';
    return 'unknown';
  }
}
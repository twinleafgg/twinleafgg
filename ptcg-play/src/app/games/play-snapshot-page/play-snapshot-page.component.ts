import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { PlaySnapshotPopupService } from '../play-snapshot-popup/play-snapshot-popup.service';

/**
 * Deep link: /snapshot/:code opens Play Both Sides from a shared state.
 */
@Component({
  selector: 'ptcg-play-snapshot-page',
  template: '',
})
export class PlaySnapshotPageComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private playSnapshotPopupService: PlaySnapshotPopupService,
  ) { }

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code') || '';
    const ref = this.playSnapshotPopupService.openDialog({
      initialCode: code,
      autoPlay: !!code,
    });
    ref.afterClosed().subscribe(played => {
      if (!played) {
        this.router.navigate(['/games']);
      }
    });
  }
}

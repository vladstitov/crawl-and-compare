import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { finalize } from 'rxjs';
import { CreateJobDialogComponent } from './create-job-dialog.component';
import {
  CreateTaskRequest,
  JobDocument,
  ServerApiService
} from './services/server-api.service';

@Component({
  selector: 'app-jobs-control-panel',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    MatChipsModule,
    MatDividerModule
  ],
  templateUrl: './jobs-control-panel.component.html',
  styleUrl: './jobs-control-panel.component.scss'
})
export class JobsControlPanelComponent implements OnInit {
  jobs: JobDocument[] = [];
  selectedJob: JobDocument | null = null;

  isLoading = false;
  isSaving = false;

  statusMessage = '';
  processStatus: unknown = null;

  constructor(
    private readonly api: ServerApiService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(preferredJobId?: string): void {
    this.isLoading = true;
    this.statusMessage = '';

    this.api
      .getJobs()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.isSaving = false;
        })
      )
      .subscribe({
        next: (jobs) => {
          const rawJobs = Array.isArray(jobs) ? jobs : [];
          this.jobs = [...rawJobs].sort((a, b) => this.toTimestamp(b.createdAt) - this.toTimestamp(a.createdAt));

          if (preferredJobId) {
            const createdJob = this.jobs.find((job) => job._id === preferredJobId);
            if (createdJob) {
              this.selectedJob = createdJob;
              return;
            }
          }

          if (!this.selectedJob && this.jobs.length > 0) {
            this.selectedJob = this.jobs[0];
            return;
          }

          if (this.selectedJob?._id) {
            const freshSelection = this.jobs.find((job) => job._id === this.selectedJob?._id);
            this.selectedJob = freshSelection ?? null;
          }
        },
        error: (error: unknown) => {
          this.statusMessage = this.getErrorMessage(error, 'Failed to load jobs.');
        },
        complete: () => {
          console.log('Job loading complete.');
        }
      });
  }

  selectJob(job: JobDocument): void {
    this.selectedJob = job;
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateJobDialogComponent, {
      width: '560px',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe((payload: CreateTaskRequest | undefined) => {
      if (!payload) {
        return;
      }

      this.isSaving = true;
      this.statusMessage = '';

      this.api.createTask(payload).subscribe({
        next: (response) => {
          this.statusMessage = 'Record created successfully.';
          this.loadJobs(response.task?._id);
        },
        error: (error: unknown) => {
          this.statusMessage = this.getErrorMessage(error, 'Failed to create record.');
          this.isSaving = false;
        },
        complete: () => {
          // Note: isSaving will be set to false when loadJobs() completes
        }
      });
    });
  }

  startProcess(): void {
    this.statusMessage = '';
    this.api.crawlStart().subscribe({
      next: () => {
        this.statusMessage = 'Process started.';
      },
      error: (error: unknown) => {
        this.statusMessage = this.getErrorMessage(error, 'Failed to start process.');
      },
      complete: () => {}
    });
  }

  stopProcess(): void {
    this.statusMessage = '';
    this.api.crawlStop().subscribe({
      next: () => {
        this.statusMessage = 'Process stop signal sent.';
      },
      error: (error: unknown) => {
        this.statusMessage = this.getErrorMessage(error, 'Failed to stop process.');
      },
      complete: () => {}
    });
  }

  getCurrentProcessStatus(): void {
    this.statusMessage = '';
    this.api.crawlStatus().subscribe({
      next: (status) => {
        this.processStatus = status;
        this.statusMessage = 'Process status loaded.';
      },
      error: (error: unknown) => {
        this.statusMessage = this.getErrorMessage(error, 'Failed to get process status.');
      },
      complete: () => {}
    });
  }

  trackByJobId(_index: number, job: JobDocument): string {
    return job._id ?? String(_index);
  }

  private toTimestamp(value: string | Date | undefined): number {
    if (!value) {
      return 0;
    }

    return new Date(value).getTime() || 0;
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const serverError = (error as { error?: { message?: string } }).error;
      if (serverError?.message) {
        return serverError.message;
      }
    }

    return fallback;
  }
}
